// Credit memo -inline document editor

(function injectMemoStyles() {
  if (document.getElementById('memo-ed-css')) return;
  const s = document.createElement('style');
  s.id = 'memo-ed-css';
  s.textContent = `
    .memo-body { outline: none; }
    .memo-body > * + * { margin-top: 8px; }
    .memo-body p  { margin: 0; line-height: 1.7; }
    .memo-body h2 { margin: 0; font-size: 14px; font-weight: 700; color: var(--c-ink); }
    .memo-body h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--c-ink); }
    .memo-body ul, .memo-body ol { padding-left: 22px; margin: 0; }
    .memo-body li { line-height: 1.8; }
    .memo-body blockquote { margin: 0; padding: 10px 14px; background: var(--c-surface-2); border-left: 3px solid var(--c-ink); border-radius: 4px; font-size: 13px; }
    .memo-body table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .memo-body th { text-align: left; padding: 7px 10px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em; color: var(--c-text-2); border-bottom: 2px solid var(--c-line-strong); }
    .memo-body td { padding: 7px 10px; border-bottom: 1px solid var(--c-line-2); font-size: 12px; }
    /* Under redigering skal cellerne kunne ses. Uden lodrette linjer ligner to
       tomme rækker bare to blanke linjer, og man kan ikke sigte efter en celle. */
    .memo-body[contenteditable="true"] td,
    .memo-body[contenteditable="true"] th { border-right: 1px solid var(--c-line-2); }
    .memo-body[contenteditable="true"] tr > *:last-child { border-right: none; }
    .memo-body[contenteditable="true"] td:empty::after,
    .memo-body[contenteditable="true"] td:has(> br:only-child)::after { content: ''; display: inline-block; min-height: 1em; }
    .memo-body td:focus-within, .memo-body th:focus-within { background: rgba(29,78,216,0.05); }

    /* Værktøjslinje der kun vises når markøren står i en tabel */
    .memo-tbl-bar {
      position: sticky; bottom: 10px; z-index: 6;
      display: flex; align-items: center; gap: 4; flex-wrap: wrap;
      margin: 10px 0 0 28px; padding: 6px 8px;
      background: var(--c-ink); border-radius: 9px;
      box-shadow: 0 6px 18px rgba(15,17,20,0.22);
    }
    .memo-tbl-bar button {
      height: 24px; padding: 0 9px; border: 0; border-radius: 6px;
      background: rgba(255,255,255,0.1); color: #fff;
      font-family: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer;
    }
    .memo-tbl-bar button:hover { background: rgba(255,255,255,0.22); }
    .memo-tbl-lbl { font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-right: 4px; }
    .memo-tbl-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.18); margin: 0 4px; }
    .memo-tbl-hint { font-size: 10.5px; color: rgba(255,255,255,0.45); margin-left: 6px; }

    /* Ophavsvisning. Slået fra som standard, for i det daglige skal dokumentet
       læses som et dokument. Slås til når man skal kunne se hvad maskinen skrev. */
    .memo-doc.show-origin [data-ai] {
      position: relative;
      padding-left: 10px;
      border-left: 2px solid transparent;
    }
    .memo-doc.show-origin [data-ai="ai"] { border-left-color: #7c8cf8; background: rgba(124,140,248,0.05); }
    .memo-doc.show-origin [data-ai="chat"] { border-left-color: #7c8cf8; background: rgba(124,140,248,0.05); }
    .memo-doc.show-origin [data-ai="edited"] { border-left-color: #b9c0cc; background: rgba(150,160,175,0.04); }
    .memo-doc.show-origin [data-ai]::after {
      content: attr(data-ai-label);
      position: absolute; right: 4px; top: 2px;
      font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase;
      color: var(--c-text-4); pointer-events: none;
    }
    .memo-body .memo-cite { border-bottom: 1.5px dotted var(--c-primary); cursor: pointer; }
    .memo-body .memo-cite:hover { background: rgba(29,78,216,0.08); border-bottom-style: solid; }
    .memo-body:focus-within { background: rgba(59,130,246,0.018); border-radius: 6px; }

    /* ── Template hints / placeholders (EIFO-template tekst) ── */
    .memo-body .tpl-hint { font-style: italic; color: var(--c-text-3); font-size: 12px; display: block; margin: 6px 0 2px; }
    .memo-body .tpl-hints { padding-left: 22px; margin: 4px 0 8px; color: var(--c-text-3); }
    .memo-body .tpl-hints li { font-size: 12.5px; line-height: 1.65; color: var(--c-text-3); }
    .memo-body .tpl-blank { background: rgba(245,158,11,0.14); border-bottom: 1.5px dashed var(--c-warn); padding: 0 5px; border-radius: 3px; color: #92400e; font-style: normal; font-size: 0.95em; }
    .memo-body .tpl-blank:empty::before { content: '…'; opacity: 0.6; }
    .memo-body .tpl-note { font-size: 11px; color: var(--c-text-4); font-style: italic; margin-top: 4px; }
    .memo-body .tpl-subhead { font-size: 13.5px; font-weight: 600; color: var(--c-ink); margin: 18px 0 6px; padding-top: 8px; border-top: 1px dashed var(--c-line); letter-spacing: -0.005em; }
    .memo-body .tpl-subhead:first-child { padding-top: 0; border-top: 0; margin-top: 0; }
    .memo-body .tpl-draft { background: rgba(59,130,246,0.04); border-left: 2px solid var(--c-primary); padding: 8px 12px; border-radius: 0 5px 5px 0; margin: 6px 0; }
    .memo-body .tpl-draft-label { display: inline-block; font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--c-primary); margin-bottom: 4px; }
    .memo-body .tpl-bevtable { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .memo-body .tpl-bevtable th { background: var(--c-ink); color: #fff; padding: 7px 10px; font-size: 11.5px; text-align: left; letter-spacing: 0.04em; text-transform: uppercase; }
    .memo-body .tpl-bevtable td { padding: 8px 10px; border-bottom: 1px solid var(--c-line-2); font-size: 12px; vertical-align: top; }
    .memo-body .tpl-bevtable td.label { color: var(--c-text-3); font-size: 11px; width: 130px; }
    .memo-body .tpl-risk { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--c-surface-2); color: var(--c-text-2); margin-left: 6px; border: 1px solid var(--c-line); }
    .memo-body .tpl-risk.lav { background: rgba(16,185,129,0.12); color: #047857; border-color: rgba(16,185,129,0.3); }
    .memo-body .tpl-risk.mid { background: rgba(245,158,11,0.12); color: #b45309; border-color: rgba(245,158,11,0.3); }
    .memo-body .tpl-risk.hoj { background: rgba(239,68,68,0.12); color: #b91c1c; border-color: rgba(239,68,68,0.3); }
    .tpl-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--c-surface-2); border: 1px solid var(--c-line-strong); color: var(--c-ink); font-weight: 600; font-size: 12px; }
    .tpl-pill.warn { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.4); color: #92400e; }
    .memo-tb { display: inline-flex; align-items: center; justify-content: center; height: 26px; min-width: 26px; padding: 0 6px; border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer; font-size: 13px; font-family: inherit; color: var(--c-text-2); transition: all 0.1s; flex-shrink: 0; }
    .memo-tb:hover { background: var(--c-surface-2); border-color: var(--c-line); color: var(--c-ink); }
    .memo-tb.on { background: var(--c-line-2); color: var(--c-ink); border-color: var(--c-line-strong); }
    .memo-tb-sep { width: 1px; height: 18px; background: var(--c-line); margin: 0 2px; flex-shrink: 0; display: inline-block; }

    /* ── Comments (right rail) ── */
    .memo-cmt-group { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; background: var(--c-surface); border-top: 1px solid var(--c-line-2); border-bottom: 1px solid var(--c-line-2); }
    .memo-cmt-group.active { background: rgba(59,130,246,0.05); border-color: var(--c-primary-border); }
    .memo-cmt-group-head { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--c-text-3); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
    .memo-cmt-group-head .num { color: var(--c-text-4); font-family: var(--mono); font-weight: 500; }
    .memo-cmt-group-head .ttl { color: var(--c-text-2); flex: 1; min-width: 0; cursor: pointer; }
    .memo-cmt-group-head .ttl:hover { color: var(--c-ink); }
    .memo-cmt-add { background: transparent; border: 0; padding: 0; cursor: pointer; color: var(--c-primary); font-size: 11px; font-weight: 500; font-family: inherit; display: inline-flex; align-items: center; gap: 3px; }
    .memo-cmt-add:hover { text-decoration: underline; }
    .memo-cmt { display: flex; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid var(--c-line-2); border-radius: 8px; box-shadow: 0 1px 2px rgba(15,17,20,0.03); }
    .memo-cmt-av { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 9.5px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .memo-cmt-body { flex: 1; min-width: 0; }
    .memo-cmt-meta { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--c-text-3); margin-bottom: 2px; flex-wrap: wrap; }
    .memo-cmt-meta b { color: var(--c-ink); font-weight: 600; font-size: 11px; }
    .memo-cmt-dept { font-size: 9.5px; font-weight: 600; padding: 1px 5px; border-radius: 999px; letter-spacing: 0.03em; text-transform: uppercase; }
    .memo-cmt-time { font-size: 10px; color: var(--c-text-4); }
    .memo-cmt-text { font-size: 12px; color: var(--c-text-2); line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
    .memo-cmt-del { background: transparent; border: 0; padding: 0; cursor: pointer; color: var(--c-text-4); font-size: 10.5px; font-family: inherit; }
    .memo-cmt-del:hover { color: var(--c-warn); }
    .memo-cmt-form { display: flex; flex-direction: column; gap: 6px; padding: 8px; background: #fff; border: 1.5px solid var(--c-primary); border-radius: 8px; }
    .memo-cmt-form textarea { width: 100%; resize: vertical; min-height: 60px; padding: 6px 8px; border: 1px solid var(--c-line); border-radius: 6px; font-size: 12px; font-family: inherit; line-height: 1.5; outline: none; box-sizing: border-box; color: var(--c-ink); }
    .memo-cmt-form-row { display: flex; align-items: center; gap: 6px; }
    .memo-cmt-empty { font-size: 11.5px; color: var(--c-text-4); font-style: italic; }

    /* ── Right-edge add-comment affordance on each section ── */
    .memo-sec { position: relative; }
    .memo-sec-add {
      position: absolute; top: 18px; right: -18px;
      width: 26px; height: 26px;
      display: grid; place-items: center;
      background: var(--c-primary); color: #fff;
      border: 0; border-radius: 50%;
      cursor: pointer; opacity: 0;
      transition: opacity 0.12s ease, transform 0.12s ease;
      box-shadow: 0 2px 6px rgba(59,130,246,0.35);
      font-size: 14px; font-weight: 700; line-height: 1; font-family: inherit;
      z-index: 3;
    }
    .memo-sec:hover .memo-sec-add { opacity: 1; }
    .memo-sec-add:hover { transform: scale(1.08); }
  `;
  document.head.appendChild(s);
})();

/* ── Departments / personas ──────────────────────────────────────────────── */
const MEMO_DEPTS = [
  { id: 'kredit',     label: 'Kredit',     author: 'Mette Larsen',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  fg: '#1d4ed8' },
  { id: 'compliance', label: 'Compliance', author: 'Jonas Holm',      color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  fg: '#7e22ce' },
  { id: 'erhverv',    label: 'Erhverv',    author: 'Sofie Andersen',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  fg: '#047857' },
  { id: 'risiko',     label: 'Risiko',     author: 'Anders Bach',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  fg: '#b45309' },
];
const MEMO_DEPT_MAP = MEMO_DEPTS.reduce((m, d) => (m[d.id] = d, m), {});

/* ── Comment storage + seed ──────────────────────────────────────────────── */
function _cmtKey(sKey) { return 'memo4-comments:' + sKey; }

function loadComments(sKey) {
  try {
    const raw = localStorage.getItem(_cmtKey(sKey));
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveComments(sKey, arr) {
  try { localStorage.setItem(_cmtKey(sKey), JSON.stringify(arr)); } catch (e) {}
}

const MEMO_COMMENT_SEED = {
  conclusion: [
    { id: 1, dept: 'risiko', author: 'Anders Bach', date: '24. maj 2026 08:45',
      text: 'Kundekoncentration bør fremhæves tydeligere her. 64% på top-3 er højt og vil være det første komiteen kigger på.' },
    { id: 2, dept: 'kredit', author: 'Mette Larsen', date: '24. maj 2026 09:02',
      text: 'God pointe — jeg har fremhævet det som punkt 1 under "på trods af". Tak.' },
  ],
  financial: [
    { id: 1, dept: 'erhverv', author: 'Sofie Andersen', date: '23. maj 2026 14:32',
      text: 'Difference på 2,0M ser ud som om primo-tallet i budgettet ikke er opdateret efter årsafslutning. Har kunden bekræftet det?' },
    { id: 2, dept: 'kredit', author: 'Mette Larsen', date: '23. maj 2026 15:08',
      text: 'Endnu ikke. Jeg har sendt en mail til Anders i går — følger op i morgen.' },
    { id: 3, dept: 'compliance', author: 'Jonas Holm', date: '24. maj 2026 09:11',
      text: 'OK. Sæt det som åbent punkt i sagsmappen indtil vi har skriftligt svar.' },
  ],
  appendix1: [
    { id: 1, dept: 'compliance', author: 'Jonas Holm', date: '24. maj 2026 10:20',
      text: 'Tilbagetrædelseserklæring på anpartshaverlånet skal være på plads inden bevilling — kan ikke godkendes uden.' },
  ],
};

(function seedMemoComments() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem('memo4-comments-seeded') === 'v2') return;
  // Clear old seed keys from v1 so layout matches current sections
  ['summary','budget','security','company','competitors','financials','kpi','open','rec','appendix'].forEach(k => {
    try { localStorage.removeItem(_cmtKey(k)); } catch (e) {}
  });
  Object.entries(MEMO_COMMENT_SEED).forEach(([k, arr]) => {
    saveComments(k, arr);
  });
  try { localStorage.setItem('memo4-comments-seeded', 'v2'); } catch (e) {}
})();

/* ── Module-level selection tracker (survives toolbar clicks) ─────────────── */
var _memoLastRange = null;
var _memoLastEditable = null;
function _memoSaveSelection() {
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && sel.focusNode) {
    _memoLastRange = sel.getRangeAt(0).cloneRange();
  }
}

/* ── Section default HTML content — følger EIFO "Kreditindstilling"-template 1:1 ─
   Konvention:
   - <em class="tpl-hint"> + <ul class="tpl-hints">  = template-vejledning verbatim
   - <h3 class="tpl-subhead">                          = template-underafsnit
   - <span class="tpl-blank">                          = felt der skal udfyldes
   - <div class="tpl-draft"> + <span class="tpl-draft-label" contenteditable="false">Udkast</span> = AI-genereret forslag */
const SEC = {
  /* ─── 1) Baggrund og formål ────────────────────────────────────────────── */
  background: `
    <h3 class="tpl-subhead">Baggrund</h3>
    <ul class="tpl-hints">
      <li>Kort indflyvning (to linjer) i form af virksomhedens væsentligste aktiviteter og forretningsmodel samt evt. "eksistensberettigelse"</li>
      <li>Kort historik: Nævn eventuelle vigtige begivenheder/milestones inden for de seneste 5 år</li>
      <li>Pengeinstituttets motiv for at invitere EIFO med i finansieringen</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p><strong>Aktiviteter:</strong> Nordhavn Composite A/S producerer fiberforstærkede kompositkomponenter, primært til vindmølleblade. Selskabet er specialiseret i korte serier med hurtig omstilling og leverer til OEM-kunder som Vestas og <span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">GE Vernova</span>.</p>
      <p><strong>Historik (seneste 5 år):</strong></p>
      <ul>
        <li>2022: Første leverance til Vestas Blades efter 18 måneders kvalifikation</li>
        <li>2024: Opskalering af produktion i Vendsyssel (+45% kapacitet)</li>
        <li>Q4 2025: Indgået <span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">rammeaftale med GE Vernova</span> for Block-Island havvindprojektet</li>
      </ul>
      <p><strong>Pengeinstituttets motiv:</strong> Nordjyske Bank ønsker at risikodele eksporteksponeringen mod USD-fakturering (Block-Island, betaling Q4 2026). Banken har eksisterende anlægslån (DKK 1,8M, 4,2%) med selskabet og vurderer EIFO-medfinansiering som nødvendig for at kunne stille den ønskede driftskredit.</p>
    </div>

    <h3 class="tpl-subhead">Låneformål</h3>
    <ul class="tpl-hints">
      <li>Årsag til låneansøgning</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Nordhavn Composite A/S ansøger om <strong><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">DKK 4,5M</span></strong> til finansiering af Block-Island ordren fra GE Vernova med leverance Q3 2026. Beløbet fordeles på materialeindkøb (kulfiber, harpiks ~ <span class="tpl-blank">DKK 2,8M</span>), igangværende arbejder (~ <span class="tpl-blank">DKK 2,4M</span>) samt arbejdskapital frem til kundens betaling i Q4 2026 (~ <span class="tpl-blank">DKK 1,8M</span>).</p>
    </div>
  `,

  /* ─── 2) Finansieringsstruktur ─────────────────────────────────────────── */
  financing: `
    <table>
      <thead><tr><th>Finansieringsplan</th><th style="text-align:right">DKK mio.</th><th style="text-align:right">%</th><th>Kapitalbehov</th><th style="text-align:right">DKK mio.</th></tr></thead>
      <tbody>
        <tr><td>EIFO-eksportkaution (80% dækning)</td><td style="text-align:right;font-family:monospace">3,6</td><td style="text-align:right;font-family:monospace">51%</td><td>Materialeindkøb (kulfiber/harpiks)</td><td style="text-align:right;font-family:monospace">2,8</td></tr>
        <tr><td>Nordjyske Bank, driftskredit</td><td style="text-align:right;font-family:monospace">2,2</td><td style="text-align:right;font-family:monospace">31%</td><td>Igangværende arbejder</td><td style="text-align:right;font-family:monospace">2,4</td></tr>
        <tr><td>Egenfinansiering (driftslikviditet)</td><td style="text-align:right;font-family:monospace">1,2</td><td style="text-align:right;font-family:monospace">17%</td><td>Arbejdskapital frem til Q4-betaling</td><td style="text-align:right;font-family:monospace">1,8</td></tr>
        <tr><td><span class="tpl-blank">[tilføj række]</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">0,0</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">%</span></td><td><span class="tpl-blank">[kapitalbehov]</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">0,0</span></td></tr>
        <tr><td><strong>Total</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">7,0</td><td style="text-align:right;font-family:monospace;font-weight:600">100 %</td><td><strong>Total</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">7,0</td></tr>
      </tbody>
    </table>
    <ul class="tpl-hints">
      <li>Vurdering af om risikodelingen er tilstrækkeligt balanceret, under hensyn til EIFOs andel af finansieringen, om EIFO kautionerer for eller bidrager med egenkapital til medfinansieringen, sikkerheder, afviklingsprofil og om EIFO er efterstillet øvrig gæld.</li>
      <li>Bemærkninger til afviklingsprofil, herunder argumenter for indledende afdragsfrihed.</li>
      <li>Evt. øvrige bemærkninger til finansieringsstrukturen.</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p><strong>Risikodeling:</strong> EIFO-kautionen dækker 80% af eksportforpligtelsen mod GE Vernova; banken bærer 20% samt løber driftskreditten på selvstændig risiko. EIFO er ikke efterstillet bankens primære eksponering — sidestillet i pant og debitorpant.</p>
      <p><strong>Afviklingsprofil:</strong> Eksportkautionen følger kontraktens leveringsplan og udløber automatisk ved kundens endelige betaling (Q4 2026). Driftskreditten er løbende med årlig revurdering. Indledende afdragsfrihed er <span class="tpl-blank">ikke relevant</span>, da faciliteten er kortvarig (≤ 12 mdr.).</p>
      <p><strong>Øvrige bemærkninger:</strong> <span class="tpl-blank">[evt. supplerende bemærkninger]</span></p>
    </div>
  `,

  /* ─── 3) Rating ─────────────────────────────────────────────────────────── */
  rating: `
    <table>
      <tbody>
        <tr><td style="width:42%">Objektiv (beregnet) Credit rating</td><td><strong>BB+</strong> <span style="color:var(--c-text-3); font-size:11px">(score 6,2/10)</span></td></tr>
        <tr><td>Indstillet Credit rating</td><td><strong>BB</strong> <span style="color:var(--c-text-3); font-size:11px">(override − 1 trin)</span></td></tr>
        <tr><td>Anvendt (-e) overrides</td><td>Kundekoncentration – nedjustering 1 trin</td></tr>
        <tr><td>Argumentation for overrides</td><td>Top-3 kunder udgør <span class="memo-cite" data-doc="Periodetal_Q1-Q3_2026.xlsx" data-page="ark Kunder">64% af omsætningen</span> med GE Vernova alene på ~38%. Den objektive model fanger ikke risikoen ved tab af én primær kunde tilstrækkeligt, hvorfor manuel nedjustering ét trin er anvendt.</td></tr>
      </tbody>
    </table>
  `,

  /* ─── 4) Juridiske forhold ─────────────────────────────────────────────── */
  legal: `
    <p>Vælg</p>
    <ul class="tpl-hints">
      <li>[Anvendes kun ved udlån]</li>
      <li>[Indsæt Legal SME's / International Regulation &amp; Relations' vurdering]</li>
      <li>Legal SME har ikke været inddraget i forbindelse med kreditindstillingen, da det er vurderet, at det indstillede ikke indeholder særlige juridiske problemstillinger.</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Legal SME har gennemgået <span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">GE Vernova-rammekontrakten</span> og bekræfter sædvanlige internationale handelsvilkår (INCOTERMS DDP, betalingsbetingelser 60 dage). Ingen exit-klausuler eller cross-default-bestemmelser vurderes problematiske.</p>
      <p>Eksportkautionsdokumentation følger EIFOs standard og er gennemgået i samarbejde med Nordjyske Banks juridiske afdeling. Tilbagetrædelseserklæring for <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">anpartshaverlån DKK 0,5M</span> mangler og er forudsætning for bevilling.</p>
    </div>
  `,

  /* ─── 5) Risikovurdering ────────────────────────────────────────────────── */
  risk: `
    <table>
      <thead><tr><th style="width:38%">Væsentligste risikoområder</th><th>Mitigering</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>Risikoområde 1 — Kundekoncentration</strong><br/><span class="memo-cite" data-doc="Periodetal_Q1-Q3_2026.xlsx" data-page="ark Kunder">Top-3 kunder = 64% af omsætningen</span>, GE Vernova alene ~38%.</td>
          <td><em>Uddyb risikoområdet / Analyser mitigerende forhold:</em><br/>Eksportkautionen er specifik for GE Vernova-ordren, hvilket adresserer den primære eksponering for nærværende facilitet. Pipeline mod Siemens Gamesa og ENERCON er etableret men endnu ikke i ordrebog.<br/><strong>Dette mitigeres ved</strong> override i rating (-1 trin) og kvartalsvis rapportering på top-5 kunder.<br/><em>Vurdering: Ikke fuldt mitigeret — fastholdes som override.</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 2 — Råvarepriser</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">Kulfiber +22% YoY</span>, prissikring kun 60%.</td>
          <td>GE Vernova-kontrakt indeholder pristilpasningsklausul ved kulfiberudsving > ±10%. Resterende 40% af forbrug dækkes af forwardkøb.<br/><em>Vurdering: Mitigeret til acceptabelt niveau.</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 3 — Valutaeksponering</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">41% af omsætning i USD/EUR</span> – ingen formel hedging-politik.</td>
          <td>GE-ordren afdækkes med forward-kontrakt 90% af kontraktværdi via Nordjyske Bank. Formel hedging-politik udarbejdes som bevillingsvilkår.<br/><em>Vurdering: Mitigeret for nærværende ordre.</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 4 — Leverancerisiko</strong><br/><span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">Block-Island leverance Q3 2026</span> kritisk for likviditet.</td>
          <td>Produktionsplan bekræftet af driftsleder, kapacitet reserveret. Backup-kapacitet hos søsterselskab Nordhavn Production ApS sikrer leveringsevne ved nedbrud.<br/><em>Vurdering: Acceptabelt mitigeret.</em></td>
        </tr>
        <tr>
          <td><span class="tpl-blank">Risikoområde 5 — [tilføj]</span></td>
          <td><span class="tpl-blank">[mitigering]</span></td>
        </tr>
      </tbody>
    </table>
    <p class="tpl-note">Tilføj eller slet rækker efter behov.</p>
  `,

  /* ─── 6) Konklusion og indstilling ─────────────────────────────────────── */
  conclusion: `
    <p><strong>Konklusion – Samlet risikovurdering: <span class="tpl-risk mid">Middel/Høj</span></strong></p>

    <p><strong>Indstilles til bevilling med baggrund i:</strong></p>
    <ul class="tpl-hints">
      <li>Vurdering af virksomhedens økonomiske levedygtighed, herunder om der er gældsserviceringsevne med tilfredsstillende margin?</li>
      <li>Hvordan understøtter finansieringen EIFOs strategi?</li>
      <li>Er der dokumenterede ledelsesmæssige kompetencer, der sandsynliggør at aktiviteten kan gennemføres og er rentabel?</li>
      <li>Er nødvendige og relevante særvilkår medtaget? [alene gældende for EIFO-kautioner]</li>
      <li>Konklusion på ESG, bilag <span class="tpl-blank">2</span></li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <ul>
        <li><strong>Økonomisk levedygtighed:</strong> Omsætningen stiger (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41,1M i 2025</span>), men indtjeningsevnen er tynd: EBITDA-marginen er <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8%</span> og uændret fra 2024. Gæld/EBITDA på <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3,3×</span> er højt for en virksomhed af denne størrelse og efterlader begrænset margin til at absorbere en forsinkelse på ordren.</li>
        <li><strong>EIFO-strategi:</strong> Direkte overensstemmelse med EIFOs eksportfokus og strategi for grøn omstilling — produktet leverer komponenter til vedvarende energi.</li>
        <li><strong>Ledelseskompetencer:</strong> Dokumenteret brancheerfaring (CEO 15 år hos Vestas Blades, CTO materialeforsker). Etableret økonomifunktion med statsautoriseret revisor.</li>
        <li><strong>Særvilkår:</strong> Hedging-politik, kvartalsvis kunderapportering og tilbagetrædelseserklæring medtaget som bevillingsvilkår (se Bilag 1).</li>
        <li><strong>ESG:</strong> Lav risiko, jf. Bilag 2 — selskabet bidrager positivt til EIFOs ESG-strategi.</li>
      </ul>
    </div>

    <p><strong>Og på trods af:</strong></p>
    <ul class="tpl-hints">
      <li>Væsentlige risici der ikke kan mitigeres til et acceptabelt niveau</li>
      <li>Manglende opfyldelse af væsentlige forhold, som EIFO vægter</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <ul>
        <li>Høj kundekoncentration (top-3 = 64%) som ikke fuldt kan mitigeres — håndteret via rating-override og rapporteringskrav.</li>
        <li>Uafklaret budgetafvigelse på primo egenkapital (difference DKK 2,0M) som bør forklares før endelig bevilling.</li>
        <li>Manglende tilbagetrædelseserklæring på <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">anpartshaverlån DKK 0,5M</span> — sættes som bevillingsforudsætning.</li>
      </ul>
    </div>
  `,

  /* ─── 7) Ejerstruktur, ledelse, bestyrelse og rådgivere ────────────────── */
  ownership: `
    <h3 class="tpl-subhead">Ejerstruktur</h3>
    <em class="tpl-hint">Analyser de væsentligste forhold, herunder [hvis relevant]:</em>
    <ul class="tpl-hints">
      <li>Hvem ejer selskaberne samt ejerandel? Er der en klar ejerstruktur?</li>
      <li>Ejes virksomheden af en fond/forening eller er ejerkredsen betydeligt fragmenteret?</li>
      <li>Konkurshistorik på ejerne. I givet fald skal der være fokus på ejernes rolle og adfærd samt hvilke kreditorer, der har lidt væsentlige tab. Hvilken læring er der gjort, og hvordan er denne indarbejdet i virksomhedens forretningsmodel, processer og governance.</li>
      <li>Ejernes og kautionister økonomiske forhold og muligheder for yderligere kapitalindskud og/eller honorere kautionsforpligtelser samt strategi for kapitalrejsning.</li>
      <li>Væsentlig aktivitet i søster/datterselskaber, såfremt det afviger fra låntager.</li>
      <li>Planer om generationsskifte og herunder evt. arvtagere.</li>
    </ul>
    <p class="tpl-note">Ved komplekse koncernstrukturer kan koncerndiagram/captable vedlægges som bilag.</p>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Selskabet er ejet af <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 1">Anders Christensen (51,8% direkte) og Anders Holding ApS (48,2%)</span>. Klar ejerstruktur uden fond/forening eller fragmenteret ejerkreds. Ingen konkurshistorik på ejere.</p>
      <p>Anders Holding ApS har ydet et <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">anpartshaverlån på DKK 0,5M (CIBOR+2%, forfald 2028)</span>. Tilbagetrædelseserklæring foreligger endnu ikke. Personlig kaution fra A. Christensen <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S4">DKK 0,5M</span> er underskrevet.</p>
      <p>Datterselskabsaktivitet: Nordhavn Production ApS (100%, produktion) og Nordhavn US Inc. (100%, salg/service). Begge i normal drift. Ingen planer om generationsskifte aktuelt – ejere er <span class="tpl-blank">[alder]</span>.</p>
    </div>

    <h3 class="tpl-subhead">Ledelse</h3>
    <em class="tpl-hint">Analyser den øverste ledelse/nøglemedarbejdere ift.:</em>
    <ul class="tpl-hints">
      <li>Funktion i virksomheden samt uddannelse, ledelses- og brancheerfaring og kompetencer, herunder om der er overensstemmelse mellem kompetencer og virksomhedens behov</li>
      <li>Eventuelle incitamentsløsninger</li>
      <li>Risikoappetit. Er ledelsen meget tilbageholdende, risikovillig eller tager de en balanceret risiko?</li>
      <li>Økonomifunktion, herunder kompetencer og kvalitet i rapportering</li>
      <li>Referencer, konkurshistorik</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <ul>
        <li><strong>CEO/medstifter:</strong> Anders Christensen, civilingeniør (DTU 2008), 15 års brancheerfaring (tidl. produktionschef Vestas Blades).</li>
        <li><strong>CTO/medstifter:</strong> Maria Lindbjerg, materialeforsker (AAU 2010).</li>
        <li><strong>CFO (ansat 2023):</strong> Henrik Sølvbjerg, cand.merc.aud., tidl. økonomichef Stark.</li>
        <li><strong>Incitamentsløsninger:</strong> <span class="tpl-blank">[ingen / bonusordning / warrants]</span></li>
        <li><strong>Risikoappetit:</strong> Balanceret — dokumenteret evne til at takke nej til urentable ordrer.</li>
        <li><strong>Økonomifunktion:</strong> Etableret med månedlig rapportering. Ingen konkurshistorik.</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">Bestyrelse</h3>
    <em class="tpl-hint">Analyser de væsentligste forhold vedrørende bestyrelse/Advisory Board, fx:</em>
    <ul class="tpl-hints">
      <li>Hvem sidder i bestyrelsen kort historik på erhvervserfaring?</li>
      <li>Særlige kompetencer, som vedkommende bidrager med</li>
      <li>Relation til ejerne, herunder om medlemmet er repræsentant for en ejer/investor?</li>
      <li>Er bestyrelsen professionel og dækker den virksomhedens behov?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Bestyrelsen består af Anders Christensen (formand, ejer), Maria Lindbjerg (medstifter) samt Lars Holm (eksternt medlem, tidl. CFO LM Wind Power, brancheekspertise).</p>
      <p>Bestyrelsen vurderes professionel men kunne med fordel suppleres med kompetencer inden for internationalisering. <span class="tpl-blank">[evt. uddybning af bestyrelsesarbejde og mødekadence]</span></p>
    </div>

    <h3 class="tpl-subhead">Rådgivere/netværk</h3>
    <p class="tpl-note">Anføres kun, hvis disse er væsentlige og der ikke er en professionel bestyrelse.</p>
    <em class="tpl-hint">Rådgivere/netværk, som er tæt på virksomheden samt kort beskrivelse ift. kompetencer samt reel værdi af sparring.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Revisor: BDO (statsautoriseret). Juridisk rådgivning: Bech-Bruun. Begge rådgivere er aktivt involveret i strategiske beslutninger.</p>
    </div>

    <p><strong>Samlet konklusion på ejerstruktur, ledelse, bestyrelse og rådgivere – Risikovurdering: <span class="tpl-risk lav">Lav</span></strong></p>
    <em class="tpl-hint">Kort konklusion på ledelseskraften herunder hvorvidt ejerne bruger bestyrelse og rådgivere aktivt samt en konklusion på, hvorvidt den er tilstrækkelig sammensat ift. at fremtidssikre virksomheden.</em>
    <p>Etableret ledelse med relevant erfaring og professionel governance. Aktiv brug af bestyrelse og rådgivere. Bestyrelsens internationaliseringskompetencer bør styrkes på sigt.</p>
  `,

  /* ─── 8) Produkter, forretningsmodel og strategi ───────────────────────── */
  product: `
    <h3 class="tpl-subhead">Produkter – Risikovurdering: <span class="tpl-risk lav">Lav</span></h3>
    <em class="tpl-hint">Analyser produktrisikoen, fx:</em>
    <ul class="tpl-hints">
      <li>Hvilke produkter/produktsegmenter virksomheden opererer med?</li>
      <li>Hvordan vurderes virksomhedens produktdiversificering/spreder virksomheden sig på produkter og/eller markeder?</li>
      <li>Hvordan er produkternes placering i værdikæden?</li>
      <li>Er produkterne baseret på lav-/højteknologi?</li>
      <li>Produceres der til lager eller ordreproduktion?</li>
      <li>Hvilket selskab i koncernen ejer evt. patent- og licensrettigheder, og er de omfattet af EIFOs pant?</li>
    </ul>
    <p class="tpl-note">[ikke relevante punkter slettes]</p>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Selskabet producerer fiberforstærkede kompositkomponenter, primært til vindmølleblade (90% af omsætning) og sekundært til marine/industri (10%). Højteknologisk produkt med betydelig viden bundet i procesoptimering. Ordrebaseret produktion — ingen lagerproduktion. Patent- og licensrettigheder ejes af moderselskabet og er omfattet af EIFOs virksomhedspant.</p>
    </div>

    <h3 class="tpl-subhead">Forretningsmodel – Risikovurdering: <span class="tpl-risk lav">Lav</span></h3>
    <em class="tpl-hint">Analyser virksomhedens nuværende forretningsmodel – herunder værditilbud.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Kontraktproduktion (B2B) for OEM-kunder i vindmølleindustrien. Værditilbud: evne til at levere korte serier med hurtig omstilling — et nichesegment hvor store captive-producenter typisk ikke er rentable. Marginer er højere end gennemsnittet i komponentindustrien grundet specialiseringsfokus.</p>
    </div>

    <h3 class="tpl-subhead">Strategi – Risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
    <em class="tpl-hint">Analyser virksomhedens fremadrettede strategi, herunder:</em>
    <ul class="tpl-hints">
      <li>Markedsstrategi, herunder geografisk koncentration og afhængighed af enkelt-markeder</li>
      <li>Produkt- og udviklingsstrategi</li>
      <li>Distributionsstrategi</li>
    </ul>
    <em class="tpl-hint">Fokuser på nye tiltag ift. nuværende set-up, og årsagen til ændret strategi.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <ul>
        <li><strong>Markedsstrategi:</strong> Udvidelse fra primært Vestas/GE Vernova mod Siemens Gamesa og europæiske ENERCON. Pipeline etableret men ikke ordrebogført. Geografisk koncentration på EU/US.</li>
        <li><strong>Produkt- og udviklingsstrategi:</strong> Større blade (50m+) og tilhørende komponenter — kræver kapitalinvestering i ny produktionshal (planlagt 2027–2028, ikke en del af nærværende ansøgning).</li>
        <li><strong>Distributionsstrategi:</strong> Direkte salg til OEM, ingen distributørled. Bibeholdes.</li>
      </ul>
      <p>Ændret strategi er primært drevet af markedsudviklingen mod offshore-vind og tilhørende større komponenter.</p>
    </div>
  `,

  /* ─── 9) Marked, konkurrence, kunder og leverandører ───────────────────── */
  market: `
    <p class="tpl-note">[For alle afsnits punkter gælder: Vurderes risikoen "Lav" anføres alene få linjer med begrundelse. Vær opmærksom på sammenhæng til kvalitative svar i rating]</p>

    <h3 class="tpl-subhead">Marked – Risikovurdering: <span class="tpl-risk lav">Lav</span></h3>
    <em class="tpl-hint">Kort analyse af risikoen i de markeder virksomheden opererer på, fx:</em>
    <ul class="tpl-hints">
      <li>Markedsudvikling og tendenser, cyklicitet og risiko for substitution</li>
      <li>Markedskoncentration</li>
      <li>Markedsdrivere</li>
      <li>Indtrængningsbarrierer</li>
      <li>Digitale trends i markedet</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Det globale marked for vindmøllekompositter forventes at vokse <span class="memo-cite" data-doc="WindEurope_Market_2026.pdf" data-page="s. 14">6,8% p.a. i 2025–2030</span>, drevet af offshore-udbygning og repowering. Moderat cyklisk (afhænger af OEM-ordreintag) men strukturelt voksende. Begrænset substitutionsrisiko, da kompositter er teknologisk vanskelige at erstatte. Høje indtrængningsbarrierer (kvalifikationsprocesser hos OEM tager 12–24 mdr.).</p>
    </div>

    <h3 class="tpl-subhead">Konkurrence – Risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
    <em class="tpl-hint">Kort analyse af konkurrenter samt hvordan virksomhedens værditilbud differentierer sig ift. disse, herunder:</em>
    <ul class="tpl-hints">
      <li>Væsentligste konkurrenter</li>
      <li>Konkurrenceparametre og differentiering ift. konkurrenterne / konkurrencefordele</li>
      <li>Evt. teknologiforskelle</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Markedet domineres af captive-producenter (Vestas Blades, Siemens Gamesa). Uafhængige leverandører: LM Wind Power, TPI Composites. Nordhavn konkurrerer i nichesegment med kortere serier hvor store aktører typisk ikke er rentable.</p>
      <table>
        <thead><tr><th>Aktør</th><th>Fokus</th><th style="text-align:right">Est. omsætning (DKK M)</th></tr></thead>
        <tbody>
          <tr><td>LM Wind Power</td><td>Standard vindmølleblade, globalt</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="WindEurope_Market_2026.pdf" data-page="s. 22">~2.000</span></td></tr>
          <tr><td>TPI Composites</td><td>Kontraktproduktion, store serier</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="WindEurope_Market_2026.pdf" data-page="s. 23">~400</span></td></tr>
          <tr><td><strong>Nordhavn Composite</strong></td><td>Specialkomponenter, korte serier</td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41,1</span></td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="tpl-subhead">Kunder – Risikovurdering: <span class="tpl-risk hoj">Høj</span></h3>
    <em class="tpl-hint">Kort analyse af kunder, herunder:</em>
    <ul class="tpl-hints">
      <li>Hvem der er virksomhedens væsentligste kunder/de 3 største kunder eller kunder der udgør mere end 20 % af omsætningen?</li>
      <li>Er der en god spredning på kunder, eller er der afhængighed af enkelte kunder, og er udviklingen i retning af større eller mindre afhængighed?</li>
      <li>Hvilken indflydelse har kunderne overfor virksomheden, herunder hvem fastsætter pris og vilkår, er der høj/lav kundeloyalitet, er det nemt og billigt eller forbundet med store omkostninger for kunderne at substituere virksomhedens produkter?</li>
      <li>Er der evt. særlige kontraktmæssige forhold?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Top-3 kunder = <span class="memo-cite" data-doc="Periodetal_Q1-Q3_2026.xlsx" data-page="ark Kunder">64% af omsætningen</span>: GE Vernova (~38%), Vestas (~16%), ENERCON (~10%). Tendens: svagt stigende koncentration grundet vækst hos GE.</p>
      <p>Kunderne har stærk forhandlingsposition og fastsætter pris i samråd. Høje skifteomkostninger for kunderne pga. kvalifikationsprocesser → høj kundeloyalitet trods ringe diversifikation. Lange kontrakter (12–36 mdr.) reducerer kortsigtet risiko.</p>
    </div>

    <h3 class="tpl-subhead">Leverandører – Risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
    <em class="tpl-hint">Kort analyse af leverandører, herunder:</em>
    <ul class="tpl-hints">
      <li>Hvem er virksomhedens væsentligste leverandører?</li>
      <li>Er der afhængighed af enkelte leverandører, kritiske komponenter, landerisiko mv.? Hvis ja, hvad er virksomhedens handlingsplan for at sikre leverancer fra alternativ leverandør?</li>
      <li>Er der muligheden for skift af leverandør (opsigelsesvarsler, skifteomkostninger og navngivne alternative leverandører)?</li>
      <li>Hvordan er virksomhedens og leverandørens indbyrdes forhandlingsstyrke ift. pris og øvrige vilkår?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Væsentligste leverandører: Toray Industries (kulfiber, Japan), Olin (epoxy-harpiks, US/EU), Owens Corning (glasfiber, EU). Afhængighed af Toray reduceres ved kvalifikation af SGL Carbon som backup — proces igangsat. Leveringstider 8–12 uger for kulfiber. Forhandlingsstyrke vurderes lav over for Toray (~75% af kulfiberforbrug), bedre på øvrige.</p>
    </div>
  `,

  /* ─── 10) Finansiel analyse ────────────────────────────────────────────── */
  financial: `
    <h3 class="tpl-subhead">Regnskabsmæssige formalia</h3>
    <em class="tpl-hint">Revisionsform, regnskaber revideret eller udvidet gennemgang? Revisortype, fx statsautoriseret eller registreret revisor. Er der forbehold / revisionsanmærkninger? Hvem har udarbejdet perioderegnskab, budgetmateriale, følsomhedsanalyse og evt. koncernsammenstilling?</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 2">Årsrapport 2025 revideret af BDO (statsautoriseret) uden forbehold eller anmærkninger</span>. Perioderegnskab Q1 2026, budget 2026–28 og følsomhedsanalyse er udarbejdet af selskabets CFO med review fra BDO. Koncernsammenstilling: <span class="tpl-blank">ikke relevant (datterselskaber konsolideres direkte i moderselskab)</span>.</p>
    </div>

    <h3 class="tpl-subhead">Resultatopgørelse</h3>
    <p><strong>Historik, årsregnskab 12-2025</strong></p>
    <ul class="tpl-hints">
      <li>Trend og årsagsforklaringer til væsentlige udvikling i historiske tal.</li>
      <li>Årsregnskabet sættes i forhold til budget for året og væsentlige budgetafvigelser årsagsforklares.</li>
      <li>Ekstraordinære poster?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <table>
        <thead><tr><th>DKK mio.</th><th style="text-align:right">2023</th><th style="text-align:right">2024</th><th style="text-align:right">2025</th></tr></thead>
        <tbody>
          <tr><td>Nettoomsætning</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2023">28,0</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2024">32,8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41,1</span></td></tr>
          <tr><td>Bruttofortjeneste</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2023">12,8</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2024">15,2</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2025">18,5</span></td></tr>
          <tr><td>EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 7" data-line="EBITDA" data-col="2023">1,3</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 7" data-line="EBITDA" data-col="2024">1,9</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7" data-line="EBITDA" data-col="2025">2,4</span></td></tr>
          <tr><td>Egenkapital</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2023">3,5</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2024">4,8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2025">6,2</span></td></tr>
        </tbody>
      </table>
      <p>Trend: omsætningen er vokset 47% på to år, men indtjeningen følger ikke med. Bruttomarginen er faldet fra 45,7% til 45,0%, og EBITDA-marginen ligger fladt på 5,8% i både 2024 og 2025. Væksten er drevet af kontraktmasse hos GE Vernova og Vestas, ikke af forbedret indtjeningsevne. Ingen ekstraordinære poster i perioden.</p>
    </div>

    <p><strong>Budget 12-2026</strong></p>
    <ul class="tpl-hints">
      <li>Anfør væsentligste budgetforudsætninger</li>
      <li>Analyser realismen i væsentlige spring i omsætning, DG og EBITDA margin mv, fx ordrebeholdning og pipeline.</li>
      <li>Er der sandsynliggjort en realistisk bro mellem den historiske driftsmæssige performance og den forventede fremtidige driftsmæssige performance?</li>
      <li>Udvikling i kapacitetsomkostninger?</li>
      <li>Matcher afskrivninger aktivets levetid?</li>
      <li>Evt. sammenligning med branchetal</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Budget 2026: omsætning <strong>DKK 44,4M</strong> (+8% YoY), EBITDA-margin 6,1%. Driver: GE Vernova-rammeaftalen. Bro: ordrebeholdning og bekræftet pipeline dækker ca. <span class="tpl-blank">85%</span> af omsætningsbudget. Kapacitetsomkostninger stiger ~12% (planlagte ansættelser). Afskrivninger matcher aktivers levetid (5 til 10 år maskiner). Sammenligning med branchetal: EBITDA-marginen på 6,1% ligger <strong>under</strong> branchemedianen på ca. 10%, hvilket efterlader begrænset stødpude ved prispres eller forsinkelser.</p>
    </div>

    <p><strong>Perioderegnskab Q1 2026 sammenlignet med budget</strong></p>
    <ul class="tpl-hints">
      <li>Forklar væsentlige afvigelser. Er det realistisk, at årsbudgettet nås? Hvis ikke, hvilket resultat estimeres for året?</li>
      <li>Er der afsat afskrivninger?</li>
      <li>Er der periodiseret?</li>
      <li>Krav til resterende del af regnskabsåret for budgetopfyldelse ("Need-to-Meet")</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Q1 2026: realiseret omsætning <span class="memo-cite" data-doc="Periodetal_Q1-Q3_2026.xlsx" data-page="ark Resultat" data-line="Nettoomsætning" data-col="Q1 2026">DKK 10,6M</span> = 24% af helårsbudget. Afskrivninger og periodisering korrekt afsat. Sæsonalitet sandsynliggør årsmål (stærk Q3 og Q4 grundet leveringsplaner). Need-to-Meet: gns. DKK 11,3M pr. kvartal i resten af året, realistisk givet pipeline.</p>
      <p><strong>Budgetafvigelse — kræver afklaring:</strong> Budget primo egenkapital <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">DKK 4,2M</span> vs. årsrapport ultimo 2025 <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 2">DKK 6,2M</span> = <strong>−2,0M ⚠</strong>. Bør forklares før endelig bevilling.</p>
    </div>

    <h3 class="tpl-subhead">Balance</h3>
    <p><strong>Seneste årsregnskab</strong></p>
    <ul class="tpl-hints">
      <li>Er værdiansættelsen af aktiverne realistisk?</li>
      <li>Væsentlige immaterielle aktiver, bygninger, varelagre, igangværende arbejder og debitorer</li>
      <li>Indregningsmetode, afskrivningsmetode</li>
      <li>Hvordan er igangværende arbejder indregnet, brutto/netto, inkl. forholdsmæssig avance?</li>
      <li>Er der en god spredning og kreditkvalitet på tilgodehavender fra salg?</li>
      <li>Gældsstruktur: Er væsentlige anlægsaktiver finansieret med lang gæld? Likviditetsgrad?</li>
      <li>Væsentlige mellemregninger</li>
      <li>Væsentlige eventualforpligtelser?</li>
      <li>Er gældsgearing (Nettorentebærende gæld/EBITDA) tilfredsstillende i forhold til branche?</li>
      <li>Soliditetsgrad med og uden ansvarlige lån (er den ansvarlige kapital negativ, skal det adresseres)?</li>
      <li>Evt. koncernsoliditet, hvor det er relevant.</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Aktiver vurderes realistisk værdiansat. Igangværende arbejder indregnes <span class="tpl-blank">[brutto/netto inkl. forholdsmæssig avance]</span>. Debitorer koncentreret på top-3 (~64%) — kreditkvalitet høj (investment grade modparter). Lange anlægsaktiver finansieret med 7-årigt anlægslån. Soliditet 44,3% (uden ansvarlig kapital), gældsgearing 3,3× målt som gæld i alt i forhold til EBITDA.</p>
    </div>

    <p><strong>Budget (balance)</strong></p>
    <ul class="tpl-hints">
      <li>Årsagsforklar og analyser på de væsentlige ændringer i forhold til seneste årsregnskab</li>
      <li>Er gældsgearingen (nettorentebærende gæld/EBITDA) tilfredsstillende?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Budget 2026 forventer gældsgearing 2,0× efter etablering af nærværende facilitet. Væsentlig ændring: stigning i varelagre/igangværende arbejder med ca. <span class="tpl-blank">DKK 1,5M</span> grundet Block-Island ordren.</p>
    </div>

    <p class="tpl-note">Ved akkvisitioner: Købsmultipler? — <em>Ikke relevant for denne sag.</em></p>

    <h3 class="tpl-subhead">Cash flow og gældsserviceringsevne</h3>
    <em class="tpl-hint">Cash flow analysen skal primært baseres på budgetter. Realismen skal ses i lyset af den historiske likviditetsgenerering.</em>
    <ul class="tpl-hints">
      <li>Er der en tilfredsstillende likviditetsgenerering fra driften?</li>
      <li>Er udviklingen i arbejdskapitalen realistisk?</li>
      <li>Matcher investeringer behovet på længere sigt?</li>
      <li>Likviditetsstatus, og herunder om træk på driftskreditter forventes at kunne holdes inden for bevilgede rammer i pengeinstitut?</li>
      <li>Er der en tilfredsstillende likviditet til afdrag på gæld? Sammenholdt med normaliserede afdragsforpligtelser efter udløb af afdragsfri periode. Kortfristet gæld uden afvikling (driftskredit og/eller andet) sættes ift. omsætningsaktiverne (LTV)</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Driftslikviditet positiv og stigende: 2023: DKK 1,1M → 2024: 1,6M → 2025: 2,1M. Arbejdskapitaludvikling realistisk (DSO ~62 dage, DPO ~45 dage). Investeringer 2026 begrænset til vedligehold (DKK 0,4M). Træk på driftskreditter forventes inden for bevilgede rammer. Gældsservicering: dækning <span class="tpl-blank">3,2×</span> på normaliserede afdragsforpligtelser.</p>
    </div>

    <h3 class="tpl-subhead">Følsomhedsanalyse</h3>
    <em class="tpl-hint">Lav en eller flere relevante følsomhedsanalyser, fx:</em>
    <ul class="tpl-hints">
      <li>Low Case fx med lavere vækstrater, lavere indtjeningsmarginaler og/eller opsigelse af kontrakter</li>
      <li>Likviditetsmæssig nulpunktsomsætning på gældsserviceringsevne, når den indledende afdragsfrihed udløber</li>
      <li>Følsomhed ift. rente og valutaudsving (er der væsentlige uafdækkede rente- og valutarisici skal det indgå i risikovurderingen i afsnit 5)</li>
      <li>Early Stage: Kan der opnås gældsserviceringsevne, hvis udvikling sættes på hold? (fall back scenarie)</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <ul>
        <li><strong>Low case</strong> (omsætning -15%, EBITDA-margin -2pp): EBITDA falder til ca. DKK 1,5M mod 2,4M i 2025. Gældsserviceringen bliver da stram, og faciliteten kan kun serviceres hvis afdragsfriheden forlænges. <span class="tpl-blank">[beregning skal dokumenteres]</span></li>
        <li><strong>Likviditetsmæssig nulpunktsomsætning</strong>: ca. DKK 38,9M mod realiseret 41,1M i 2025. Der er altså kun ca. 5% luft til nulpunktet.</li>
        <li><strong>Valutafølsomhed:</strong> USD -10% giver EBITDA-impact ca. -0,3M efter hedging — håndterbart.</li>
        <li><strong>Rentefølsomhed:</strong> +200bp på CIBOR3 = +DKK 44k/år i rente — uvæsentligt.</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">Konklusion - Risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
    <ul class="tpl-hints">
      <li>Realismen i budgetter? Er den budgetterede indtjening tilfredsstillende?</li>
      <li>Vurderes aktiverne realistisk værdiansat, og er der risiko for ekstraordinært store prisfald i tilfælde af konkurs?</li>
      <li>Er gældsserviceringsevnen tilfredsstillende?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Realismen i budgetter vurderes acceptabel betinget af forklaring på primo-egenkapitalafvigelse. Aktiverne vurderes realistisk værdiansat — moderat konkursværdi-risiko på specialmaskiner. Gældsserviceringsevnen er tilfredsstillende.</p>
    </div>

    <h3 class="tpl-subhead">Nøgletalstabel</h3>
    <p class="tpl-note">[Indsæt "Tabel" med regnskabs- og budgettal (resultatopgørelse, balance og cash-flow) fra Excel-ark eller udtræk fra virksomhedens materiale.]</p>
    <table>
      <thead><tr><th>Nøgletal</th><th style="text-align:right">2023</th><th style="text-align:right">2024</th><th style="text-align:right">2025</th></tr></thead>
      <tbody>
        <tr><td>Bruttomargin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2023">45,7%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2024">46,3%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2025">45,0%</span></td></tr>
        <tr><td>EBITDA-margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2023">4,6%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2024">5,8%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8%</span></td></tr>
        <tr><td>Soliditetsgrad</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2023">37,2%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2024">42,9%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2025">44,3%</span></td></tr>
        <tr><td>Gæld / EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2023">4,5×</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2024">3,4×</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3,3×</span></td></tr>
        <tr><td>Likviditetsgrad</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2023">2,2</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2024">2,5</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2025">2,5</span></td></tr>
      </tbody>
    </table>
  `,

  /* ─── 11) Indstillings- og bevillingspåtegning ─────────────────────────── */
  endorsement: `
    <table class="tpl-bevtable">
      <thead><tr><th colspan="3">Indstillingspåtegning</th></tr></thead>
      <tbody>
        <tr>
          <td class="label">Dato:</td>
          <td><span class="tpl-blank">dd-mm-2026</span></td>
          <td style="width:30%"><strong>Indstillingsniveau:</strong> <span class="tpl-blank">Kundechef</span> · <strong>Initial:</strong> <span class="tpl-blank">ML</span></td>
        </tr>
        <tr>
          <td class="label" style="vertical-align:top">Bemærkninger:</td>
          <td colspan="2"><span class="tpl-blank">[Indstillers bemærkninger]</span></td>
        </tr>
      </tbody>
    </table>

    <table class="tpl-bevtable">
      <thead><tr><th colspan="3">Bevillingspåtegning</th></tr></thead>
      <tbody>
        <tr>
          <td class="label">Dato:</td>
          <td><span class="tpl-blank">dd-mm-2026</span></td>
          <td style="width:30%"><strong>Bevillingsinstans:</strong> <span class="tpl-blank">Kreditkomité</span> · <strong>Initial:</strong> <span class="tpl-blank">—</span></td>
        </tr>
        <tr>
          <td class="label" style="vertical-align:top">Bemærkninger / referat fra kreditkomité / BBU / Bestyrelsen:</td>
          <td colspan="2"><span class="tpl-blank">[Referat fra bevillingsmøde]</span></td>
        </tr>
      </tbody>
    </table>
  `,

  /* ─── Bilag 1 – Vilkår ─────────────────────────────────────────────────── */
  appendix1: `
    <p class="tpl-note">[For samtlige afsnit gælder, at ikke relevant indhold slettes]</p>

    <h3 class="tpl-subhead">Engagement</h3>
    <table>
      <thead><tr><th>Eksisterende + ansøgt engagement</th><th style="text-align:right">DKK mio.</th><th>Løbetid</th><th>Første afdrag / trækperiode</th><th>Første rente</th><th>Låneprofil</th></tr></thead>
      <tbody>
        <tr><td>Vækstlån, eksisterende</td><td style="text-align:right;font-family:monospace">0,0</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
        <tr><td>EIFO-kaution, eksisterende lån/kredit, dækning xx %</td><td style="text-align:right;font-family:monospace">0,0</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
        <tr><td>Vækstlån, nyt</td><td style="text-align:right;font-family:monospace">0,0</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
        <tr><td><strong>EIFO-eksportkaution, ny — 80% dækning</strong></td><td style="text-align:right;font-family:monospace">3,6</td><td>12 mdr.</td><td>Q2 2026</td><td>Q2 2026</td><td>Engangskaution</td></tr>
        <tr><td><strong>I alt EIFO</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">3,6</td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
    <p class="tpl-note">EIFO har foretaget en direkte investering/ejerandel med en bogført værdi på DKK xx,x mio. <em>[slettes, hvis ej relevant]</em></p>

    <p><strong>Kautionstager / Medfinansierende pengeinstitut:</strong> Nordjyske Bank, kontakt: <span class="tpl-blank">Lars Pedersen, lars.pedersen@nordjyskebank.dk</span></p>
    <p><strong>Tabsmandater:</strong> Ingen <span class="tpl-blank">[eller angiv mandat]</span></p>
    <ul>
      <li>Tjekliste for valgte tabsmandat er udfyldt <span class="tpl-blank">[ja/nej]</span></li>
      <li><span class="tpl-blank">Maks. to linjer begrundelse for valg af "ingen tabsmandat", hvis kriterier for mandat er opfyldt</span></li>
    </ul>

    <h3 class="tpl-subhead">Marginal / præmie</h3>
    <ul>
      <li>Variabel CIBOR 3-rente med et tillæg på <strong>2,75 % p.a.</strong> (driftskredit, Nordjyske Bank)</li>
      <li>Præmie (EIFO-kaution): <strong>1,40 % p.a.</strong> af kautionsbeløb</li>
      <li><span class="tpl-blank">Maks. to linjer med begrundelse for afvigelse fra beregnet marginal/præmie</span></li>
    </ul>

    <h3 class="tpl-subhead">Stiftelses- / etableringsgebyr</h3>
    <p>Standard: 0,75 % af hovedstol + DKK 15.000 per facilitet</p>

    <h3 class="tpl-subhead">Tilsagnsprovision / Break fee</h3>
    <ul>
      <li>Standard: <span class="tpl-blank">[X,0 % p.a.]</span> af den uudnyttede del af lånet beregnet fra <span class="tpl-blank">[accept af lånetilbud / indgåelse af låneaftale / udbetalingstidspunkt]</span></li>
      <li>Break fee: DKK <span class="tpl-blank">x</span> mio. hvis et lånetilbud på endeligt afstemte og indstillede vilkår ikke aftages</li>
    </ul>

    <h3 class="tpl-subhead">Exit fee</h3>
    <p><span class="tpl-blank">Ingen</span> <em>eller</em> Standard med indgangsværdi DKK <span class="tpl-blank">x</span> mio.</p>

    <h3 class="tpl-subhead">Sikkerheder [lån og garantier]</h3>
    <p><strong>Primær pant — eksisterende sikkerheder:</strong></p>
    <ul>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S1">2,8 mio. virksomhedspant (maskiner)</span> — tinglyst</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S2">1,8 mio. pant, Havnegade 47</span> — tinglyst</li>
    </ul>
    <p><strong>Nye / forhøjede sikkerheder:</strong></p>
    <ul>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S3">1,2 mio. debitorpant (Vestas, GE)</span> — tinglyst</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S4">0,5 mio. personlig selvskyldnerkaution af Anders Christensen, CPR-nr. <span class="tpl-blank">xxxxxx-xxxx</span></span>. Kautionen respekterer bankens kaution.</li>
      <li>Tilbagetrædelse fra Anders Holding ApS, CVR-nr. <span class="tpl-blank">xx</span>, vedr. anpartshaverlån DKK 0,5 mio. — <strong>⚠ mangler underskrift</strong></li>
      <li>DKK <span class="tpl-blank">x,x</span> mio. nom. anparter/aktier i Anders Holding ApS, CVR-nr. <span class="tpl-blank">xx</span>, <span class="tpl-blank">xx</span> % af ejerandel</li>
    </ul>

    <h3 class="tpl-subhead">Covenants og erklæringer [lån og garantier]</h3>
    <ul>
      <li><strong>Udbyttebegrænsning:</strong> Ingen udlodninger uden EIFO-godkendelse i kautionsperioden.</li>
      <li><strong>Soliditet:</strong> ≥ 35 % rapporteres halvårligt.</li>
      <li>Forudsætning for opfyldelse af VK 1-3 [grønne covenants]: <span class="tpl-blank">[N/A – ikke grøn finansiering]</span></li>
    </ul>

    <h3 class="tpl-subhead">Rapporteringer [lån og garantier]</h3>
    <ul>
      <li>Reviderede årsregnskaber inden for 5 mdr. efter regnskabsår</li>
      <li>Kvartalsrapport (max 45 dage efter kvartalsslut)</li>
      <li>Koncernsammenstilling udarbejdet af revisor? <span class="tpl-blank">[Ja/Nej]</span></li>
    </ul>

    <h3 class="tpl-subhead">Særvilkår [EIFO-kautioner]</h3>
    <p>Kautionspræmiesatsen er fastsat til <strong>1,40 %</strong> p.a. Kautionstager har oplyst, at rentemarginalen på Kreditfaciliteten udgør <strong>2,75 %</strong> p.a. Hvis Kautionstager forhøjer rentemarginalen, skal EIFO orienteres og præmien til EIFO forhøjes procentvis tilsvarende.</p>
    <p><strong>Fravigelser og/eller yderligere krav i forhold til de Generelle vilkår:</strong> <span class="tpl-blank">[Formulering skal følge formuleringen i Særvilkårskataloget — indfør vilkår her]</span></p>

    <p><strong>Inden udstedelse af police, skal følgende være opfyldt og dokumenteret:</strong></p>
    <ul>
      <li>Underskrevet tilbagetrædelseserklæring fra Anders Holding ApS</li>
      <li>Forward-kontrakt USD-hedging 90 % af kontraktværdi</li>
      <li>Tinglyst virksomhedspant + debitorpant</li>
    </ul>

    <h3 class="tpl-subhead">Udbetalingsbetingelser [lån og garantier]</h3>
    <ul>
      <li><strong>Tranche 1:</strong> DKK 2,0 mio. udbetales senest <span class="tpl-blank">15.06.2026</span>. Dokumentation: tinglyst sikkerhed + underskrevet tilbagetrædelseserklæring.</li>
      <li><strong>Tranche 2:</strong> DKK 2,5 mio. udbetales senest <span class="tpl-blank">15.08.2026</span>. Dokumentation: bekræftet ordreafgang (GE Vernova milestone 1) + dokumentation for, at låntager har positiv egenkapital ved tranchen.</li>
    </ul>

    <h3 class="tpl-subhead">Pengeinstitut-engagement</h3>
    <table>
      <thead><tr><th>Nordjyske Bank</th><th style="text-align:right">DKK mio.</th><th>Løbetid</th><th>Rente</th></tr></thead>
      <tbody>
        <tr><td>Anlægslån, eksisterende</td><td style="text-align:right;font-family:monospace">1,8</td><td>7 år</td><td>4,2 %</td></tr>
        <tr><td>Anlægslån, nyt</td><td style="text-align:right;font-family:monospace">0,0</td><td>—</td><td>—</td></tr>
        <tr><td>Driftskredit, ny</td><td style="text-align:right;font-family:monospace">2,2</td><td>12 mdr.</td><td>CIBOR3 + 2,75 %</td></tr>
        <tr><td><strong>I alt</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">4,0</td><td></td><td></td></tr>
      </tbody>
    </table>

    <h3 class="tpl-subhead">Pengeinstitut sikkerheder</h3>
    <p><strong>Eksisterende:</strong></p>
    <ul>
      <li>Pant i Havnegade 47 (1. prioritet)</li>
      <li>Virksomhedspant, 1. prioritet</li>
    </ul>
    <p><strong>Nye / forhøjede:</strong></p>
    <ul>
      <li>Debitorpant (2. prioritet efter EIFO)</li>
    </ul>

    <h3 class="tpl-subhead">Interkreditoraftale</h3>
    <p>Standard med overtræksret DKK <span class="tpl-blank">1,0</span> mio. i op til tre måneder uden involvering af EIFO.</p>
  `,

  /* ─── Bilag 2 – ESG ────────────────────────────────────────────────────── */
  appendix2: `
    <p class="tpl-note">[For samtlige afsnit gælder, at ikke relevant indhold slettes]</p>

    <h3 class="tpl-subhead">[For EIFO-produkter &lt; DKK 50 mio., som ikke vedrører finansiering på EIFOs opmærksomhedsliste]</h3>
    <p>ESG er håndteret vha. en standarderklæring og indeholder alene en forpligtelse om at overholde minimumsgarantierne.</p>

    <p class="tpl-note">[ESG-risici vurderes med udgangspunkt i nedstående hjælpespørgsmål]</p>

    <h3 class="tpl-subhead">Virksomhedens arbejde med ESG [med fokus på risikostyring]</h3>
    <ul class="tpl-hints">
      <li>Har virksomheden etableret et ESG-ledelsessystem, der effektivt og systematisk håndterer virksomhedens arbejde med risikostyring indenfor miljø- og sociale forhold?</li>
      <li>Har virksomheden nedskrevne politikker og/eller procedurer til at håndtere ESG-risici?</li>
      <li>Har virksomheden overfor leverandører tydeliggjort virksomhedens forventninger og minimumskrav for ansvarlig virksomhedsadfærd, fx kontrakter, Code of Conduct eller lign.?</li>
      <li>Har virksomheden kortlagt kendte risici, som virksomheden eller leverandørkæden kan være forbundet til?</li>
      <li>Har virksomheden på baggrund af risikovurderingen igangsat konkrete initiativer mhp. at håndtere risici?</li>
      <li>Har virksomheden en klagemekanisme (whistleblowerordning) tilgængelig for sine interessenter til at indberette kritisable forhold i værdikæden?</li>
      <li>Benytter virksomheden auditprogrammer, fx ISO 9001, ISO 14001, ISO 45001 eller lign.?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <ul>
        <li><strong>Ledelsessystem:</strong> ISO 9001-certificeret kvalitetsledelse, ISO 14001 (miljø) på vej — forventes certificeret Q4 2026.</li>
        <li><strong>Politikker:</strong> Nedskrevne politikker for miljø, arbejdsmiljø og leverandøradfærd. Code of Conduct offentligt tilgængelig.</li>
        <li><strong>Leverandørkrav:</strong> Code of Conduct kommunikeret til alle primære leverandører. Toray (kulfiber) er ISO 14001/45001-certificeret.</li>
        <li><strong>Risikokortlægning:</strong> Gennemført 2025. Hovedrisici: energiforbrug, kemikaliehåndtering (harpiks), arbejdsmiljø (fiberhåndtering).</li>
        <li><strong>Initiativer:</strong> Energieffektivisering af hærdeovne (2024), opgradering af ventilation/filtre (2025).</li>
        <li><strong>Whistleblower:</strong> Klagemekanisme etableret 2024 via Got Ethics.</li>
        <li><strong>Auditprogrammer:</strong> ISO 9001 (aktiv), ISO 14001 (på vej), ISO 45001 (under overvejelse).</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">[For EIFO-produkter &gt; DKK 50 mio. eller på EIFOs opmærksomhedsliste]</h3>
    <p class="tpl-note">— Ikke relevant for denne sag (facilitet under DKK 50 mio.). Afsnit kan slettes.</p>
    <p><strong>ESG-risici:</strong> <em class="tpl-hint">ESG's vurdering angiver følgende konklusion: [indsæt 1) Overordnet konklusion, 2) Illustration i form af et spidergram der viser den nuværende og ønskede ESG performance af virksomhedens ledelsessystem, 3) Illustration af ESG's vurdering af forretningens ESG-risikoprofil]</em></p>

    <h3 class="tpl-subhead">Konklusion – Risikovurdering: <span class="tpl-risk lav">Lav</span></h3>
    <p>ESG-håndteringen vurderes tilfredsstillende for facilitetens størrelse og branche. Selskabets fokus på vedvarende energi (vindmøllekomponenter) understøtter EIFOs strategiske ESG-fokus positivt.</p>
  `,

  /* ─── Bilag 3 – Koncerndiagram ─────────────────────────────────────────── */
  appendix3: `
    <p class="tpl-note">[slettes hvis ej relevant]</p>
    <p class="tpl-note">[Hvis der ikke foreligger et diagram, kan det evt. oprettes via excel-filen "Koncernstruktur Template", der ligger i Templafy]</p>

    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Selskabets koncernstruktur er enkel:</p>
      <pre style="font-family: var(--mono); font-size: 11.5px; line-height: 1.5; background: var(--c-surface-2); padding: 10px 14px; border-radius: 6px; margin: 6px 0;">
Anders Christensen (51,8%)     Anders Holding ApS (48,2%)
                  \\           /
                   \\         /
              Nordhavn Composite A/S
              CVR 38 42 71 56 (låntager)
                   /         \\
                  /           \\
 Nordhavn Production ApS    Nordhavn US Inc.
 CVR 40 12 88 04 (100%)     Delaware (100%)
 (produktion DK)            (salg/service US)
      </pre>
      <table>
        <thead><tr><th>Selskab</th><th>CVR</th><th>Ejerandel</th><th>Aktivitet</th></tr></thead>
        <tbody>
          <tr><td><strong>Nordhavn Composite A/S</strong> (moder / låntager)</td><td style="font-family:monospace">38 42 71 56</td><td>—</td><td>Holding + produktion DK</td></tr>
          <tr><td>Nordhavn Production ApS</td><td style="font-family:monospace">40 12 88 04</td><td>100 %</td><td>Produktion (datterselskab DK)</td></tr>
          <tr><td>Nordhavn US Inc.</td><td style="font-family:monospace">— (Delaware)</td><td>100 %</td><td>Salgs- og servicekontor (US)</td></tr>
        </tbody>
      </table>
      <p>Ingen øvrige tilknyttede virksomheder eller mellemregninger af væsentlig størrelse.</p>
    </div>

    <h3 class="tpl-subhead">Bilagsliste (sagsmappe)</h3>
    <table>
      <thead><tr><th style="width:28px">#</th><th>Dokument</th><th>Type</th><th>Dato</th></tr></thead>
      <tbody>
        <tr><td style="font-family:monospace;color:#8a9099">1</td><td>Aarsrapport_2025.pdf</td><td>Årsrapport</td><td style="color:#8a9099">28. apr 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">2</td><td>Aarsrapport_2024.pdf</td><td>Årsrapport</td><td style="color:#8a9099">15. apr 2025</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">3</td><td>Budget_2026-28_v3.xlsx</td><td>Budget</td><td style="color:#8a9099">24. maj 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">4</td><td>Periodetal_Q1-2026.xlsx</td><td>Periodetal</td><td style="color:#8a9099">12. apr 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">5</td><td>Pantebrev_maskiner.pdf</td><td>Sikkerhed</td><td style="color:#8a9099">3. feb 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">6</td><td>Tinglysning_Havnegade.pdf</td><td>Sikkerhed</td><td style="color:#8a9099">14. jan 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">7</td><td>Personlig_kaution_AC.pdf</td><td>Kaution</td><td style="color:#8a9099">10. mar 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">8</td><td>Selskabskaution_AH.pdf</td><td>Kaution</td><td style="color:#8a9099">10. mar 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">9</td><td>Ejerbog_2026.pdf</td><td>Selskab</td><td style="color:#8a9099">1. jan 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">10</td><td>GE_Vernova_kontrakt.pdf</td><td>Kontrakt</td><td style="color:#8a9099">14. feb 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">11</td><td>Debitorpant_aftale.pdf</td><td>Sikkerhed</td><td style="color:#8a9099">3. feb 2026</td></tr>
        <tr><td style="font-family:monospace;color:#8a9099">12</td><td>CVR_udtraek_2026-05-30.pdf</td><td>Offentligt</td><td style="color:#8a9099">30. maj 2026</td></tr>
      </tbody>
    </table>
  `,
};

/* ── Sources per section (EIFO template-sektioner) ───────────────────────── */
/* Navne og sidehenvisninger her skal matche window.CASE_DOCS ordret. Listen
   styrer både kildepanelet og hvilke dokumenter AI'en får som grundlag for
   det enkelte afsnit. */
const MEMO_SOURCES = {
  background:  [{ t: "Aarsrapport_2025.pdf", p: "s. 2, s. 4 -Selskabsoplysninger og ledelsesberetning" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "s. 1 -projektoversigt" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 2 -bankens motiv" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197" }],
  financing:   [{ t: "Budget_2026-28_v3.xlsx", p: "linje 197 -finansieringsplan" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "§4 -betalingsbetingelser" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 1, s. 4 -vilkår" }, { t: "Sikkerhedsdokumenter.pdf", p: "S1-S5" }],
  rating:      [{ t: "Periodetal_Q1-Q3_2026.xlsx", p: "ark Kunder" }, { t: "Aarsrapport_2025.pdf", p: "s. 9 -Nøgletal" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 3 -bankens rating" }],
  legal:       [{ t: "GE_Vernova_rammekontrakt.pdf", p: "§11, §14" }, { t: "Aarsrapport_2025.pdf", p: "note 14 -Anpartshaverlån" }, { t: "Sikkerhedsdokumenter.pdf", p: "S5 -afventer underskrift" }],
  risk:        [{ t: "Periodetal_Q1-Q3_2026.xlsx", p: "ark Kunder, ark Ordrebog" }, { t: "Aarsrapport_2025.pdf", p: "note 18 -risici" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "§3, §7" }, { t: "WindEurope_Market_2026.pdf", p: "s. 23-24" }],
  conclusion:  [{ t: "Aarsrapport_2025.pdf", p: "s. 6, s. 9" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197, ark Likviditet" }, { t: "Periodetal_Q1-Q3_2026.xlsx", p: "ark Resultat" }, { t: "Sikkerhedsdokumenter.pdf", p: "S5" }],
  ownership:   [{ t: "Ejerbog_2026.pdf", p: "s. 1, s. 3-4" }, { t: "Aarsrapport_2025.pdf", p: "note 14 -Anpartshaverlån" }, { t: "Sikkerhedsdokumenter.pdf", p: "S4 -personlig kaution" }],
  product:     [{ t: "Aarsrapport_2025.pdf", p: "s. 4 -Forretningsmodel" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "s. 1, §2" }, { t: "WindEurope_Market_2026.pdf", p: "s. 22" }],
  market:      [{ t: "WindEurope_Market_2026.pdf", p: "s. 14, 22-24" }, { t: "Periodetal_Q1-Q3_2026.xlsx", p: "ark Kunder" }, { t: "Aarsrapport_2025.pdf", p: "s. 4 -Markedsforhold" }],
  financial:   [{ t: "Aarsrapport_2025.pdf", p: "s. 6-9, s. 14 -Revisionspåtegning" }, { t: "Aarsrapport_2024.pdf", p: "s. 6-9" }, { t: "Aarsrapport_2023.pdf", p: "s. 6-9" }, { t: "Periodetal_Q1-Q3_2026.xlsx", p: "ark Resultat, ark Balance" }, { t: "Budget_2026-28_v3.xlsx", p: "ark Resultat, ark Likviditet" }],
  endorsement: [],
  appendix1:   [{ t: "Sikkerhedsdokumenter.pdf", p: "S1-S5" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 4 -covenants" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197" }],
  appendix2:   [{ t: "Aarsrapport_2025.pdf", p: "s. 11 -CSR/ESG note" }, { t: "WindEurope_Market_2026.pdf", p: "s. 24" }],
  appendix3:   [{ t: "Ejerbog_2026.pdf", p: "s. 2 -Datterselskaber" }, { t: "Aarsrapport_2025.pdf", p: "s. 2 -Selskabsoplysninger" }],
};

/* ── SectionDot ───────────────────────────────────────────────────────────── */
function SectionDot({ status }) {
  const base = { width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block' };
  if (status === 'ok')    return <span style={{ ...base, background: 'var(--c-success)' }}/>;
  if (status === 'warn')  return <span style={{ ...base, background: 'var(--c-warn)' }}/>;
  if (status === 'draft') return <span style={{ ...base, background: 'transparent', border: '1.5px solid var(--c-text-4)' }}/>;
  if (status === 'info')  return <span style={{ ...base, background: 'var(--c-primary)' }}/>;
  return <span style={{ ...base, background: 'var(--c-text-4)' }}/>;
}

/* ── MemoToolbar ──────────────────────────────────────────────────────────── */
function MemoToolbar({ focusedKey, onReset, onOpenCitePicker, citeOpen }) {
  const [fmt, setFmt] = React.useState({ bold: false, italic: false, block: '' });

  React.useEffect(() => {
    const update = () => {
      try {
        const block = document.queryCommandValue('formatBlock').toLowerCase().replace(/[<>]/g, '');
        setFmt({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), block });
      } catch (e) {}
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  function cmd(command, value) { document.execCommand(command, false, value || null); }

  function insertTable() {
    cmd('insertHTML', `<table><thead><tr><th>Kolonne 1</th><th>Kolonne 2</th><th style="text-align:right">Kolonne 3</th></tr></thead><tbody><tr><td>&#8203;</td><td>&#8203;</td><td>&#8203;</td></tr><tr><td>&#8203;</td><td>&#8203;</td><td>&#8203;</td></tr></tbody></table><p><br></p>`);
  }

  const Btn = ({ ch, title, active, onClick, wide, style: extraStyle }) => (
    <button
      className={'memo-tb' + (active ? ' on' : '')}
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{ fontSize: wide ? 11 : 13, minWidth: wide ? 32 : 26, ...extraStyle }}
    >{ch}</button>
  );

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
      padding: '7px 14px', borderBottom: '1px solid var(--c-line-2)',
      background: 'var(--c-surface)',
    }}>
      <Btn ch={<b>F</b>} title="Fed (⌘B)" active={fmt.bold} onClick={() => cmd('bold')}/>
      <Btn ch={<i style={{ fontStyle: 'italic' }}>K</i>} title="Kursiv (⌘I)" active={fmt.italic} onClick={() => cmd('italic')}/>
      <div className="memo-tb-sep"/>
      <Btn ch="¶" title="Normal afsnit" active={fmt.block === 'p' || fmt.block === 'div' || fmt.block === ''} onClick={() => cmd('formatBlock', 'p')}/>
      <Btn ch="H2" title="Overskrift" active={fmt.block === 'h2'} onClick={() => cmd('formatBlock', fmt.block === 'h2' ? 'p' : 'h2')} wide/>
      <Btn ch="H3" title="Underoverskrift" active={fmt.block === 'h3'} onClick={() => cmd('formatBlock', fmt.block === 'h3' ? 'p' : 'h3')} wide/>
      <div className="memo-tb-sep"/>
      <Btn ch="❝" title="Callout / citat" active={fmt.block === 'blockquote'} onClick={() => cmd('formatBlock', fmt.block === 'blockquote' ? 'p' : 'blockquote')}/>
      <div className="memo-tb-sep"/>
      <Btn ch="•" title="Punktliste" onClick={() => cmd('insertUnorderedList')}/>
      <Btn ch="1." title="Nummerliste" onClick={() => cmd('insertOrderedList')} wide/>
      <Btn ch="⊞" title="Indsæt tabel (2 rækker × 3 kolonner)" onClick={insertTable}/>
      <div className="memo-tb-sep"/>
      <Btn ch="↩" title="Fortryd (⌘Z)" onClick={() => cmd('undo')}/>
      <Btn ch="↪" title="Annullér fortryd (⌘Y)" onClick={() => cmd('redo')}/>
      <div className="memo-tb-sep"/>
      <button
        className={'memo-tb' + (citeOpen ? ' on' : '')}
        title="Indsæt kildereference fra dokumenter i sagen"
        style={{ fontSize: 11, minWidth: 52 }}
        onClick={e => {
          _memoSaveSelection();
          const rect = e.currentTarget.getBoundingClientRect();
          onOpenCitePicker({ top: rect.bottom + 6, left: rect.left });
        }}
      >@ Kilde</button>
      {focusedKey && (
        <>
          <div className="memo-tb-sep"/>
          <span style={{ fontSize: 10.5, color: 'var(--c-warn)', background: 'rgba(176,111,23,0.08)', border: '1px solid rgba(176,111,23,0.2)', borderRadius: 4, padding: '2px 7px', marginLeft: 2 }}>Redigeret</span>
          <button
            className="memo-tb"
            style={{ fontSize: 11, color: 'var(--c-text-2)' }}
            title="Nulstil dette afsnit til AI-tekst"
            onMouseDown={e => { e.preventDefault(); onReset(focusedKey); }}
          >Nulstil afsnit</button>
        </>
      )}
    </div>
    </div>
  );
}

/* ── Comment helpers ─────────────────────────────────────────────────────── */
function _cmtInitials(name) {
  return name.split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}
function _cmtStamp() {
  const now = new Date();
  const pad = (n) => n < 10 ? '0' + n : '' + n;
  const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  return `${now.getDate()}. ${months[now.getMonth()]} ${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/* ── MemoCommentGroup (one section's comments + composer in right rail) ── */
function MemoCommentGroup({ section, persona, isActive, composerOpen, onComposerToggle, onChanged, scrollToSection }) {
  const sKey = section.k;
  const [comments, setComments] = React.useState(() => loadComments(sKey));
  const [text, setText] = React.useState('');

  React.useEffect(() => { setComments(loadComments(sKey)); }, [sKey, composerOpen]);

  function persist(next) {
    setComments(next);
    saveComments(sKey, next);
    if (onChanged) onChanged();
  }

  function submit() {
    const t = text.trim();
    if (!t) return;
    const d = MEMO_DEPT_MAP[persona] || MEMO_DEPTS[0];
    persist([...comments, { id: Date.now(), dept: d.id, author: d.author, date: _cmtStamp(), text: t }]);
    setText('');
    onComposerToggle(null);
  }

  function remove(id) {
    persist(comments.filter(c => c.id !== id));
  }

  if (comments.length === 0 && !composerOpen) return null;

  return (
    <div className={'memo-cmt-group' + (isActive ? ' active' : '')}>
      <div className="memo-cmt-group-head">
        <span className="num">{section.num}</span>
        <span className="ttl" onClick={() => scrollToSection(sKey)} title="Spring til sektion">{section.label}</span>
        {!composerOpen && (
          <button type="button" className="memo-cmt-add" onClick={() => onComposerToggle(sKey)}>+ Tilføj</button>
        )}
      </div>

      {comments.map(c => {
        const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
        return (
          <div key={c.id} className="memo-cmt">
            <div className="memo-cmt-av" style={{ background: d.color }}>{_cmtInitials(c.author)}</div>
            <div className="memo-cmt-body">
              <div className="memo-cmt-meta">
                <b>{c.author}</b>
                <span className="memo-cmt-dept" style={{ background: d.bg, color: d.fg }}>{d.label}</span>
                <span style={{ flex: 1 }}/>
                <button className="memo-cmt-del" title="Slet kommentar" onClick={() => remove(c.id)}>Slet</button>
              </div>
              <div className="memo-cmt-time">{c.date}</div>
              <div className="memo-cmt-text" style={{ marginTop: 4 }}>{c.text}</div>
            </div>
          </div>
        );
      })}

      {composerOpen && (
        <div className="memo-cmt-form">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv en kommentar til kollegaer fra andre afdelinger…"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
              if (e.key === 'Escape') { onComposerToggle(null); setText(''); }
            }}
          />
          <div className="memo-cmt-form-row">
            <span style={{ flex: 1 }}/>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => { onComposerToggle(null); setText(''); }}
            >Annullér</button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!text.trim()}
              onClick={submit}
            >Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MemoCommentsRail (right column, scroll-synced like Google Docs) ────── */
const RAIL_VIEWPORT_H = 600;

function MemoCommentsRail({ sections, sectionOffsets, scrollTop, persona, onPersonaChange, activeKey, composerForKey, onComposerToggle, onChanged, scrollToSection, totalCount }) {
  return (
    <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16, overflow: 'hidden' }}>
      <div className="card-head">
        <div>
          <div className="card-title">Kommentarer</div>
          <div className="card-sub">{totalCount} på tværs af memoet</div>
        </div>
      </div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-line-2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--c-text-3)' }}>
        <span>Skriver som</span>
        <select
          value={persona}
          onChange={(e) => onPersonaChange(e.target.value)}
          style={{ flex: 1, height: 26, padding: '0 6px', border: '1px solid var(--c-line)', borderRadius: 5, fontSize: 11.5, background: '#fff', color: 'var(--c-ink)', fontFamily: 'inherit' }}
        >
          {MEMO_DEPTS.map(d => (
            <option key={d.id} value={d.id}>{d.author} · {d.label}</option>
          ))}
        </select>
      </div>
      <div style={{ position: 'relative', height: RAIL_VIEWPORT_H, overflow: 'hidden' }}>
        {sections.map(s => {
          const offset = sectionOffsets[s.k];
          if (offset == null) return null;
          const top = offset - scrollTop;
          // Render only groups close enough to viewport so we have "kun et par stykker"
          if (top < -260 || top > RAIL_VIEWPORT_H + 40) return null;
          // Fade out near the edges for smoothness
          let opacity = 1;
          if (top < -180) opacity = Math.max(0, (top + 260) / 80);
          else if (top > RAIL_VIEWPORT_H - 40) opacity = Math.max(0, (RAIL_VIEWPORT_H + 40 - top) / 80);
          return (
            <div
              key={s.k}
              style={{
                position: 'absolute', left: 0, right: 0, top: 0,
                transform: `translateY(${top}px)`,
                opacity,
                transition: 'opacity 0.18s ease-out',
                willChange: 'transform, opacity',
                pointerEvents: opacity < 0.4 ? 'none' : 'auto',
              }}
            >
              <MemoCommentGroup
                section={s}
                persona={persona}
                isActive={activeKey === s.k}
                composerOpen={composerForKey === s.k}
                onComposerToggle={onComposerToggle}
                onChanged={onChanged}
                scrollToSection={scrollToSection}
              />
            </div>
          );
        })}
        {totalCount === 0 && composerForKey == null && (
          <div style={{ padding: '24px 14px', fontSize: 12, color: 'var(--c-text-3)', textAlign: 'center', lineHeight: 1.6 }}>
            Ingen kommentarer endnu. Hover over en sektion og klik på <span style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', fontSize: 11, fontWeight: 700, verticalAlign: 'middle' }}>+</span> for at starte en tråd.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tabelredigering ─────────────────────────────────────────────────────────
   Skabelonen beder ordret brugeren om at "tilføje eller slette rækker efter
   behov", men der var ingen måde at gøre det på. execCommand kan ikke, så
   operationerne laves direkte på DOM'en.
   ──────────────────────────────────────────────────────────────────────────── */

/** Finder den celle markøren står i, hvis den står i en tabel. */
function cellAtSelection(root) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  let n = sel.getRangeAt(0).startContainer;
  if (n.nodeType === 3) n = n.parentElement;
  if (!n || !n.closest) return null;
  const cell = n.closest('td, th');
  if (!cell || (root && !root.contains(cell))) return null;
  return cell;
}

/** Alle rækker i tabellen, både i thead og tbody, i visuel rækkefølge. */
function allRows(table) {
  return Array.from(table.querySelectorAll('tr'));
}

function cellIndex(cell) {
  return Array.from(cell.parentElement.children).indexOf(cell);
}

function makeCell(tag, template) {
  const c = document.createElement(tag);
  // Arv justering og skrifttype fra nabocellen, ellers ser tabellen rodet ud
  if (template && template.getAttribute('style')) c.setAttribute('style', template.getAttribute('style'));
  c.innerHTML = '<br>';
  return c;
}

function tableInsertRow(cell, where) {
  const tr = cell.parentElement;
  const row = document.createElement('tr');
  Array.from(tr.children).forEach(c => row.appendChild(makeCell(c.tagName === 'TH' ? 'td' : 'td', c)));
  tr.parentElement.insertBefore(row, where === 'above' ? tr : tr.nextSibling);
  return row.children[cellIndex(cell)] || row.children[0];
}

function tableDeleteRow(cell) {
  const tr = cell.parentElement;
  const table = tr.closest('table');
  if (allRows(table).length <= 1) return null;
  const next = tr.nextElementSibling || tr.previousElementSibling;
  tr.remove();
  return next ? next.children[0] : null;
}

function tableInsertCol(cell, where) {
  const table = cell.closest('table');
  const at = cellIndex(cell);
  allRows(table).forEach(tr => {
    const ref = tr.children[at];
    const tag = ref && ref.tagName === 'TH' ? 'th' : 'td';
    const c = makeCell(tag, ref);
    if (where === 'left') tr.insertBefore(c, ref || null);
    else tr.insertBefore(c, ref ? ref.nextSibling : null);
  });
  return cell;
}

function tableDeleteCol(cell) {
  const table = cell.closest('table');
  const at = cellIndex(cell);
  const first = allRows(table)[0];
  if (!first || first.children.length <= 1) return null;
  allRows(table).forEach(tr => { if (tr.children[at]) tr.children[at].remove(); });
  return null;
}

/** Sætter markøren i en celle. */
function focusCell(cell) {
  if (!cell) return;
  const r = document.createRange();
  r.selectNodeContents(cell);
  r.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}

/** Næste eller forrige celle i tabellen, på tværs af rækker. */
function siblingCell(cell, dir) {
  const table = cell.closest('table');
  const cells = Array.from(table.querySelectorAll('td, th'));
  const i = cells.indexOf(cell);
  return cells[i + dir] || null;
}

/* ── Fortryd for programmatiske ændringer ────────────────────────────────────
   AI'en skriver med innerHTML og insertAdjacentHTML. Ingen af delene lægger
   noget i browserens egen fortryd-stak, og teksten gemmes med det samme i
   localStorage. Uden det her lag er en times skrivearbejde væk for altid i det
   øjeblik man trykker Generér på et afsnit man selv har skrevet.
   ──────────────────────────────────────────────────────────────────────────── */

const SNAP_KEY = 'memo4:snap:';
const MAX_SNAPS = 20;

function loadSnaps(sKey) {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY + sKey) || '[]'); } catch (e) { return []; }
}

function saveSnaps(sKey, list) {
  try { localStorage.setItem(SNAP_KEY + sKey, JSON.stringify(list.slice(-MAX_SNAPS))); } catch (e) {}
}

function pushSnap(sKey, html, action) {
  const list = loadSnaps(sKey);
  // Samme indhold to gange i træk er ikke et nyt trin
  if (list.length && list[list.length - 1].html === html) return;
  list.push({ html: html, action: action, at: Date.now() });
  saveSnaps(sKey, list);
  try { window.dispatchEvent(new CustomEvent('memo-snap-changed', { detail: { sKey: sKey } })); } catch (e) {}
}

function popSnap(sKey) {
  const list = loadSnaps(sKey);
  const last = list.pop();
  saveSnaps(sKey, list);
  try { window.dispatchEvent(new CustomEvent('memo-snap-changed', { detail: { sKey: sKey } })); } catch (e) {}
  return last;
}

function snapLabel(action) {
  return {
    write: 'skrev afsnittet forfra',
    rewrite: 'omskrev afsnittet',
    selection: 'omskrev en markering',
    chat: 'indsatte tekst fra chatten',
    reset: 'nulstillede til skabelonen',
  }[action] || 'ændrede afsnittet';
}

/* ── MemoSection ──────────────────────────────────────────────────────────── */
function MemoSection({ id, sKey, num, title, status, onFocusSection, resetTrigger, onAddComment, commentCount, registerApi, aiOpen, onToggleAi, aiSelection, onCloseAi }) {
  const storageKey = 'memo4:' + sKey;
  const defaultHtml = SEC[sKey] || '';
  const ref = React.useRef(null);
  const [modified, setModified] = React.useState(() => localStorage.getItem(storageKey) !== null);

  // Initialize innerHTML once on mount
  React.useEffect(() => {
    if (!ref.current) return;
    const saved = localStorage.getItem(storageKey);
    ref.current.innerHTML = saved || defaultHtml;
  }, []);

  const persist = React.useCallback(() => {
    if (!ref.current) return;
    localStorage.setItem(storageKey, ref.current.innerHTML);
    setModified(true);
  }, [storageKey]);

  /* Gør afsnittet styrbart udefra: AI-assistenten, chatten og
     "Generér memo" skriver alle igennem det her lille API. */
  React.useEffect(() => {
    if (!registerApi) return;
    // Gem altid det der stod før, så ændringen kan rulles tilbage
    const snap = (action) => { if (ref.current) pushSnap(sKey, ref.current.innerHTML, action); };
    registerApi(sKey, {
      getHtml: () => (ref.current ? ref.current.innerHTML : ''),
      getText: () => (ref.current ? ref.current.innerText : ''),
      replace: (html, action) => {
        if (!ref.current) return;
        snap(action || 'rewrite');
        ref.current.innerHTML = html;
        persist();
      },
      append: (html, action) => {
        if (!ref.current) return;
        snap(action || 'chat');
        ref.current.insertAdjacentHTML('beforeend', html);
        persist();
      },
      // Bruges mens der streames. Tager bevidst intet snapshot: ét snapshot per
      // afsnit tages før streamingen går i gang, ikke ét per opdatering.
      paint: (html) => { if (ref.current) ref.current.innerHTML = html; },
      // Afslutter en streaming: gemmer, men snapshotter ikke, da det allerede
      // er gjort før streamingen begyndte.
      commit: (html) => { if (ref.current) { ref.current.innerHTML = html; persist(); } },
      snapshot: (action) => snap(action),
      replaceSelection: (html, range) => {
        if (!ref.current) return;
        // Markeringen skal ligge i DETTE afsnit. Ellers havner teksten et
        // andet sted uden at nogen opdager det.
        const r = range || _memoLastRange;
        if (!r || !ref.current.contains(r.commonAncestorContainer)) return false;
        snap('selection');
        ref.current.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('insertHTML', false, html);
        persist();
        return true;
      },
      undo: () => {
        const last = popSnap(sKey);
        if (!last || !ref.current) return null;
        ref.current.innerHTML = last.html;
        persist();
        return last;
      },
      snapCount: () => loadSnaps(sKey).length,
    });
    return () => registerApi(sKey, null);
  }, [sKey, persist, registerApi]);

  // Reset when parent signals. Også her skal der kunne fortrydes: en nulstilling
  // kaster brugerens egen tekst væk, ikke bare AI'ens.
  React.useEffect(() => {
    if (resetTrigger === 0) return;
    if (ref.current) pushSnap(sKey, ref.current.innerHTML, 'reset');
    localStorage.removeItem(storageKey);
    if (ref.current) ref.current.innerHTML = defaultHtml;
    setModified(false);
  }, [resetTrigger]);

  /* Fortryd-knappen i afsnitshovedet vises kun når der er noget at fortryde */
  const [snaps, setSnaps] = React.useState(() => loadSnaps(sKey).length);
  React.useEffect(() => {
    const on = (e) => { if (!e.detail || e.detail.sKey === sKey) setSnaps(loadSnaps(sKey).length); };
    window.addEventListener('memo-snap-changed', on);
    return () => window.removeEventListener('memo-snap-changed', on);
  }, [sKey]);

  function undoAi() {
    const last = popSnap(sKey);
    if (!last || !ref.current) return;
    ref.current.innerHTML = last.html;
    localStorage.setItem(storageKey, last.html);
    setModified(true);
  }

  const handleInput = () => {
    if (!ref.current) return;
    /* Rådgiveren retter i en AI-skrevet blok. To ting sker, og de skal ikke
       forveksles:
         Udkast-mærket fjernes. Han har taget teksten til sig.
         Ophavet BEVARES, men skifter til "rettet". Sporet må ikke forsvinde,
         for så kan ingen bagefter se hvad maskinen skrev. */
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.anchorNode) {
        let el = sel.anchorNode;
        if (el.nodeType === 3) el = el.parentElement;

        const draft = el && el.closest ? el.closest('.tpl-draft') : null;
        if (draft) {
          draft.querySelectorAll('.tpl-draft-label').forEach(lbl => lbl.remove());
          draft.classList.remove('tpl-draft');
        }

        const block = el && el.closest ? el.closest('[data-ai]') : null;
        if (block && block.getAttribute('data-ai') === 'ai') {
          block.setAttribute('data-ai', 'edited');
        } else if (block && block.getAttribute('data-ai') === 'chat') {
          block.setAttribute('data-ai', 'edited');
        }
      }
    } catch (e) { /* selection may be unavailable; ignore */ }

    localStorage.setItem(storageKey, ref.current.innerHTML);
    setModified(true);
    onFocusSection(sKey, true);
  };

  const handlePaste = (e) => {
    // En kopieret tabel fra Excel eller Word skal beholde sin struktur. Den
    // renses gennem samme filter som AI-output, så der ikke følger fremmed
    // styling og skjulte tags med ind i dokumentet.
    const html = e.clipboardData.getData('text/html');
    if (html && window.MemoAI && window.MemoAI.cleanHtml) {
      const cleaned = window.MemoAI.cleanHtml(html);
      if (cleaned && /<(table|ul|ol|p|h3|h4)\b/i.test(cleaned)) {
        e.preventDefault();
        document.execCommand('insertHTML', false, cleaned);
        persist();
        return;
      }
    }
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    // I en tabel flytter Tab mellem celler. Uden for tabeller rykker den ind,
    // som før. Tidligere pakkede Tab celleindhold ind i en blockquote.
    const cell = cellAtSelection(ref.current);
    if (cell) {
      e.preventDefault();
      const next = siblingCell(cell, e.shiftKey ? -1 : 1);
      if (next) { focusCell(next); return; }
      if (e.shiftKey) return;
      // Tab i sidste celle laver en ny række
      focusCell(tableInsertRow(cell, 'below'));
      persist();
      return;
    }
    e.preventDefault();
    document.execCommand(e.shiftKey ? 'outdent' : 'indent');
  };

  /* Værktøjslinje der kun dukker op når markøren står i en tabel */
  const [tableCell, setTableCell] = React.useState(null);

  const syncTableCell = React.useCallback(() => {
    setTableCell(cellAtSelection(ref.current));
  }, []);

  function tableOp(fn, arg) {
    if (!tableCell || !ref.current) return;
    pushSnap(sKey, ref.current.innerHTML, 'table');
    const target = fn(tableCell, arg);
    persist();
    if (target) focusCell(target);
    setTimeout(syncTableCell, 0);
  }

  const isPlaceholder = false;

  return (
    <div id={id} className="memo-sec" style={{ marginBottom: 34, scrollMarginTop: 16 }}>
      <button
        type="button"
        className="memo-sec-add"
        title="Tilføj kommentar til denne sektion"
        onClick={(e) => { e.stopPropagation(); onAddComment && onAddComment(sKey); }}
      >+</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--c-text-4)', width: 20, flexShrink: 0 }}>{num}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', flex: 1 }}>{title}</h3>
        <button
          type="button"
          className={'memo-sec-ai' + (aiOpen ? ' on' : '')}
          title="Lad AI skrive eller omskrive netop dette afsnit"
          onClick={() => onToggleAi && onToggleAi(sKey)}
        >AI</button>
        {snaps > 0 && (
          <button
            type="button"
            onClick={undoAi}
            title={'Fortryd: ' + snapLabel((loadSnaps(sKey).slice(-1)[0] || {}).action) + '. ' + snaps + ' trin gemt.'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 22, padding: '0 8px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--c-line)', background: '#fff',
              color: 'var(--c-text-2)', fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
            }}
          >
            <I.Undo size={11}/> Fortryd
          </button>
        )}
        {commentCount > 0 && (
          <span
            title={`${commentCount} kommentar${commentCount === 1 ? '' : 'er'}`}
            style={{
              fontSize: 10.5, fontWeight: 600, color: 'var(--c-primary)',
              background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
              borderRadius: 999, padding: '1px 8px',
            }}
          >{commentCount}</span>
        )}
      </div>
      <div
        ref={ref}
        className="memo-body"
        contentEditable={!isPlaceholder}
        suppressContentEditableWarning
        data-placeholder={isPlaceholder ? 'Skrives manuelt af kreditmedarbejder…' : undefined}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onMouseUp={() => { _memoLastEditable = ref.current; _memoSaveSelection(); syncTableCell(); }}
        onKeyUp={() => { _memoLastEditable = ref.current; _memoSaveSelection(); syncTableCell(); }}
        onBlur={() => setTimeout(syncTableCell, 150)}
        onFocus={() => { _memoLastEditable = ref.current; if (!isPlaceholder) onFocusSection(sKey, modified); }}
        onBlur={() => onFocusSection(null, false)}
        style={{
          paddingLeft: 28, fontSize: 13, lineHeight: 1.7, color: 'var(--c-text)',
          outline: 'none', minHeight: isPlaceholder ? 64 : 20,
          ...(isPlaceholder ? {
            background: 'var(--c-surface-2)', borderRadius: 8,
            border: '1.5px dashed var(--c-line-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '18px 28px', fontSize: 13, color: 'var(--c-text-3)', fontStyle: 'italic',
          } : {}),
        }}
      />

      {tableCell && (
        <div className="memo-tbl-bar">
          <span className="memo-tbl-lbl">Tabel</span>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertRow, 'above')} title="Indsæt række over">Række over</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertRow, 'below')} title="Indsæt række under">Række under</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableDeleteRow)} title="Slet den række markøren står i">Slet række</button>
          <span className="memo-tbl-sep"/>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertCol, 'left')} title="Indsæt kolonne til venstre">Kolonne venstre</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertCol, 'right')} title="Indsæt kolonne til højre">Kolonne højre</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableDeleteCol)} title="Slet den kolonne markøren står i">Slet kolonne</button>
          <span className="memo-tbl-hint">Tab skifter celle</span>
        </div>
      )}

      {aiOpen && window.MemoAI && (
        <window.MemoAI.AiSectionAssistant
          sKey={sKey}
          num={num}
          title={title}
          selection={aiSelection}
          getHtml={() => (ref.current ? ref.current.innerHTML : '')}
          onReplace={(html) => {
            if (!ref.current) return true;
            if (aiSelection) {
              // Markeringen blev gemt da panelet blev åbnet. Ligger den ikke
              // længere i dette afsnit, ville teksten havne et vilkårligt
              // andet sted uden at nogen opdagede det.
              const r = aiSelection.range || _memoLastRange;
              if (!r || !ref.current.contains(r.commonAncestorContainer)) return false;
              pushSnap(sKey, ref.current.innerHTML, 'selection');
              ref.current.focus();
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(r);
              document.execCommand('insertHTML', false, html);
            } else {
              pushSnap(sKey, ref.current.innerHTML, 'rewrite');
              ref.current.innerHTML = html;
            }
            persist();
            return true;
          }}
          onAppend={(html) => {
            if (!ref.current) return true;
            pushSnap(sKey, ref.current.innerHTML, 'chat');
            ref.current.insertAdjacentHTML('beforeend', html);
            persist();
            return true;
          }}
          onClose={() => onCloseAi && onCloseAi()}
        />
      )}
    </div>
  );
}

/* ── Klargøring til eksport ──────────────────────────────────────────────────
   Det eksporterede dokument er det eneste af værktøjet nogen uden for huset
   ser. Skabelonens vejledningstekst, gule Udkast-mærker og interne noter må
   ikke følge med ud til kreditkomitéen.
   ──────────────────────────────────────────────────────────────────────────── */

function prepareForExport(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';

  // Vejledning til den der skriver. Hører ikke hjemme i det færdige dokument.
  d.querySelectorAll('.tpl-hints, .tpl-hint, .tpl-guide').forEach(el => el.remove());

  // Ophavsmærkerne er internt arbejdsmateriale. De skal kunne læses i sagen,
  // ikke sendes ud af huset.
  d.querySelectorAll('[data-ai]').forEach(el => {
    el.removeAttribute('data-ai');
    el.removeAttribute('data-ai-at');
    el.removeAttribute('data-ai-label');
  });

  // "Udkast"-mærket er en arbejdsmarkering. Teksten bliver, mærket ryger.
  d.querySelectorAll('.tpl-draft-label').forEach(el => el.remove());
  d.querySelectorAll('.tpl-draft').forEach(el => el.classList.remove('tpl-draft'));

  // Uudfyldte felter skal være synlige for læseren, ikke camoufleret som tekst.
  d.querySelectorAll('.tpl-blank').forEach(el => {
    const t = (el.textContent || '').trim().replace(/^\[|\]$/g, '');
    const mark = document.createElement('span');
    mark.className = 'blank';
    mark.textContent = '[ikke udfyldt: ' + t + ']';
    el.replaceWith(mark);
  });

  // Kildehenvisningerne beholder deres tekst, men bliver til en fodnotelignende
  // reference så læseren kan se hvor tallet kommer fra i et Word-dokument.
  d.querySelectorAll('.memo-cite').forEach(el => {
    const doc = el.getAttribute('data-doc');
    const page = el.getAttribute('data-page');
    if (doc) {
      const ref = document.createElement('span');
      ref.className = 'cite-ref';
      ref.textContent = ' [' + doc + (page ? ', ' + page : '') + ']';
      el.after(ref);
    }
    el.replaceWith(...el.childNodes);
  });

  return d.innerHTML;
}

/** Tæller hvad der mangler, så man advares før man sender. */
function exportReadiness(sections) {
  let blanks = 0;
  let empty = [];
  sections.forEach(s => {
    const saved = localStorage.getItem('memo4:' + s.k);
    if (saved === null) empty.push(s.num + '. ' + s.label);
    const d = document.createElement('div');
    d.innerHTML = saved || SEC[s.k] || '';
    blanks += d.querySelectorAll('.tpl-blank').length;
  });
  return { blanks, empty };
}

/* Vises før eksport. Man skal vide hvad man sender, ikke opdage det bagefter. */
function ExportDialog({ sections, onClose }) {
  const [withComments, setWithComments] = React.useState(false);
  const ready = React.useMemo(() => exportReadiness(sections), [sections]);
  const commentCount = React.useMemo(
    () => sections.reduce((n, s) => n + loadComments(s.k).length, 0), [sections]);

  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', zIndex: 9500, display: 'grid', placeItems: 'center', padding: 24 }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
      >
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--c-ink)' }}>Eksportér til Word</div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.55 }}>
            Skabelonens vejledningstekst og Udkast-mærker fjernes automatisk. Kildehenvisninger
            skrives ud som dokumentnavn og side, så modtageren kan slå efter.
          </div>
        </div>

        <div style={{ padding: '16px 24px 4px' }}>
          {(ready.empty.length > 0 || ready.blanks > 0) && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 14,
              background: 'var(--c-warn-bg)', border: '1px solid #f4dfb7',
              fontSize: 12.5, color: 'var(--c-warn)', lineHeight: 1.55,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 3 }}>Dokumentet er ikke færdigt</div>
              {ready.empty.length > 0 && (
                <div>{ready.empty.length} afsnit er ikke skrevet: {ready.empty.slice(0, 3).join(', ')}{ready.empty.length > 3 ? ' og ' + (ready.empty.length - 3) + ' mere' : ''}.</div>
              )}
              {ready.blanks > 0 && <div>{ready.blanks} felter mangler at blive udfyldt.</div>}
              <div style={{ marginTop: 4 }}>De markeres tydeligt i filen, så de ikke kan overses.</div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
            <input type="checkbox" checked={withComments} onChange={e => setWithComments(e.target.checked)} style={{ marginTop: 2 }}/>
            <span>
              <span style={{ fontSize: 13, color: 'var(--c-ink)' }}>Tag de interne kommentarer med</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.5 }}>
                {commentCount} kommentar{commentCount === 1 ? '' : 'er'} fra Kredit, Legal og Erhverv.
                Skal normalt blive i huset. Før fulgte de altid med.
              </span>
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 24px 20px' }}>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm" onClick={onClose}>Annullér</button>
          <button className="btn btn-sm btn-primary" onClick={() => { exportMemoToWord(sections, { comments: withComments }); onClose(); }}>
            Hent filen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Word export ─────────────────────────────────────────────────────────── */
function exportMemoToWord(sections, opts) {
  opts = opts || {};
  const esc = (s) => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts = [];
  parts.push(`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`);
  parts.push(`<head><meta charset="utf-8"><title>Kreditindstilling - Nordhavn Composite A/S</title>`);
  parts.push(`<style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #222; }
    h1 { font-size: 20pt; color: #111; margin: 0 0 4pt; }
    h2 { font-size: 13pt; color: #111; margin: 18pt 0 6pt; border-bottom: 1pt solid #333; padding-bottom: 2pt; }
    h3 { font-size: 11pt; color: #333; margin: 10pt 0 4pt; }
    p { margin: 0 0 6pt; line-height: 1.45; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 6pt 0; }
    th { border-bottom: 1.5pt solid #333; padding: 4pt 6pt; text-align: left; font-weight: 600; color: #333; }
    td { border-bottom: 0.5pt solid #bbb; padding: 4pt 6pt; }
    blockquote { background: #f5f5f5; border-left: 3pt solid #333; padding: 8pt 12pt; margin: 8pt 0; }
    ul, ol { margin: 4pt 0 6pt 18pt; }
    li { margin: 2pt 0; }
    .memo-cite { border-bottom: 1pt dotted #4F81BD; }
    .meta { color: #555; font-size: 10pt; }
    .cmt-box { background: #fff8e6; border-left: 3pt solid #d97706; padding: 6pt 10pt; margin: 4pt 0; font-size: 10pt; }
    .cmt-meta { color: #555; font-size: 9pt; margin-bottom: 2pt; }
    .cmt-dept { font-weight: 600; }
    .blank { color: #b45309; background: #fff8e6; padding: 0 3pt; }
    .cite-ref { color: #4F81BD; font-size: 8.5pt; }
  </style></head><body>`);
  parts.push(`<h1>Kreditindstilling · Nordhavn Composite A/S</h1>`);
  parts.push(`<p class="meta"><strong>Indstilling af nyt engagement til Kreditkomité</strong><br/>Kreditrisiko: Middel/Høj · Kundetype: Erhverv – SMV</p>`);
  parts.push(`<table style="width:100%; font-size:10pt; margin: 8pt 0 14pt;">`);
  parts.push(`<tr><td><strong>Dato:</strong> 24. maj 2026</td><td><strong>CVR:</strong> 38 42 71 56</td></tr>`);
  parts.push(`<tr><td><strong>Branche:</strong> Vindmøllekomponenter / komposit</td><td><strong>Sagsnr.:</strong> 2026-0184</td></tr>`);
  parts.push(`<tr><td><strong>Primær kundeansvarlig:</strong> Mette Larsen, Kredit</td><td><strong>Sekundær:</strong> Sofie Andersen, Erhverv</td></tr>`);
  parts.push(`</table>`);
  parts.push(`<p class="meta">Dispensation fra acceptkriterie: Ingen · Eksporteret ${new Date().toLocaleDateString('da-DK')}</p>`);

  sections.forEach(s => {
    const saved = localStorage.getItem('memo4:' + s.k);
    const heading = /^B\d/.test(s.num) ? esc(s.label) : `${esc(s.num)}) ${esc(s.label)}`;
    parts.push(`<h2>${heading}</h2>`);
    if (saved === null) {
      // Aldrig rørt. Før blev skabelonen med al dens vejledning eksporteret
      // som om det var færdig tekst.
      parts.push(`<p class="blank">[afsnittet er ikke skrevet]</p>`);
    } else {
      parts.push(prepareForExport(saved));
    }

    // Interne noter følger kun med hvis brugeren beder om det
    if (opts.comments) {
      const comments = loadComments(s.k);
      if (comments.length > 0) {
        parts.push(`<h3>Interne kommentarer (${comments.length})</h3>`);
        comments.forEach(c => {
          const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
          parts.push(`<div class="cmt-box"><div class="cmt-meta"><span class="cmt-dept">${esc(c.author)}</span> · ${esc(d.label)} · ${esc(c.date)}</div>${esc(c.text).replace(/\n/g, '<br/>')}</div>`);
        });
      }
    }
  });

  parts.push(`</body></html>`);
  const html = parts.join('\n');
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Kreditindstilling-Nordhavn-Composite.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── WSMemo ───────────────────────────────────────────────────────────────── */
/* ── Generér memo: vælg afsnit før AI'en skriver ─────────────────────────── */
function GenerateMemoDialog({ sections, modified, onCancel, onStart }) {
  const [picked, setPicked] = React.useState(() => {
    const m = {};
    sections.forEach(s => { m[s.k] = true; });
    return m;
  });
  const chosen = sections.filter(s => picked[s.k]);
  const overwritten = chosen.filter(s => modified[s.k]);

  function toggle(k) { setPicked(p => ({ ...p, [k]: !p[k] })); }
  function setAll(v) {
    const m = {};
    sections.forEach(s => { m[s.k] = v; });
    setPicked(m);
  }

  return (
    <div onMouseDown={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', zIndex: 10000, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onMouseDown={e => e.stopPropagation()}
        style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
        <div style={{ padding: '20px 24px 12px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--c-ink)' }}>Generér kreditindstillingen</div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.55 }}>
            Hvert afsnit skrives ud fra sagens dokumenter, de realiserede periodetal og årsregnskaberne.
            Teksten kommer med kildehenvisninger, så du kan se hvor hvert tal stammer fra.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px 8px' }}>
          <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>{chosen.length} af {sections.length} valgt</span>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm btn-ghost" onClick={() => setAll(true)}>Vælg alle</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setAll(false)}>Fravælg alle</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--c-line-2)', borderBottom: '1px solid var(--c-line-2)' }}>
          {sections.map(s => (
            <label key={s.k}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', cursor: 'pointer', fontSize: 12.5, borderBottom: '1px solid var(--c-line-2)' }}>
              <input type="checkbox" checked={!!picked[s.k]} onChange={() => toggle(s.k)}/>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--c-text-4)', width: 22 }}>{s.num}</span>
              <span style={{ flex: 1, color: 'var(--c-ink)' }}>{s.label}</span>
              {modified[s.k] && (
                <span style={{ fontSize: 10.5, color: 'var(--c-warn)', background: 'var(--c-warn-bg)', borderRadius: 4, padding: '1px 6px' }}>redigeret</span>
              )}
            </label>
          ))}
        </div>

        <div style={{ padding: '14px 24px 18px' }}>
          {overwritten.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--c-warn)', background: 'var(--c-warn-bg)', border: '1px solid #f4dfb7', borderRadius: 8, padding: '8px 11px', marginBottom: 12, lineHeight: 1.5 }}>
              {overwritten.length} af de valgte afsnit er redigeret manuelt. De bliver overskrevet.
              Du kan fravælge dem ovenfor.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm" onClick={onCancel}>Annullér</button>
            <button className="btn btn-sm btn-primary" disabled={!chosen.length}
              onClick={() => onStart(chosen.map(s => s.k))}>
              Skriv {chosen.length} afsnit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Viser hvad kontrollen fandt. Tre slags fund, hver med sin konsekvens:
   et dødt dokument betyder at henvisningen lover noget der ikke findes,
   en forkert side at dokumentet findes men ikke stedet, og et uafstemt tal
   at memoet siger noget andet end regnskabstabellen i samme app. */
function AuditPanel({ audit, onClose, onGoto, sections }) {
  const ok = audit.count === 0;
  const findSection = (label) => {
    const s = (sections || []).find(x => (x.num + '. ' + x.label) === label);
    return s ? s.k : null;
  };

  const Row = ({ tone, head, body, section }) => {
    const key = findSection(section);
    return (
      <li style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 0', borderTop: '1px solid var(--c-line-2)' }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', marginTop: 6, flexShrink: 0,
          background: tone === 'bad' ? '#b03030' : 'var(--c-warn)',
        }}/>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--c-ink)' }}>{head}</span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2 }}>{body}</span>
        </span>
        {key && (
          <button className="btn btn-sm btn-ghost" style={{ flexShrink: 0 }} onClick={() => onGoto(key)}>
            Gå til
          </button>
        )}
      </li>
    );
  };

  return (
    <div style={{
      margin: '0 0 12px', padding: '12px 16px', borderRadius: 10,
      background: ok ? 'rgba(16,138,80,0.05)' : 'var(--c-warn-bg)',
      border: '1px solid ' + (ok ? 'rgba(16,138,80,0.25)' : '#f4dfb7'),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: ok ? 'var(--c-success)' : 'var(--c-warn)' }}>
          {ok
            ? 'Kontrol gennemført. Alle kildehenvisninger findes, og alle afstemte tal stemmer med regnskabstabellen.'
            : audit.count + (audit.count === 1 ? ' forhold kræver din stillingtagen' : ' forhold kræver din stillingtagen')}
        </span>
        <div style={{ flex: 1 }}/>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>Luk</button>
      </div>

      {!ok && (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
          {audit.mismatch.map((m, i) => (
            <Row key={'m' + i} tone="bad" section={m.section}
              head={'Tallet ' + m.got.toLocaleString('da-DK') + ' stemmer ikke med regnskabet, der siger ' + m.expect.toLocaleString('da-DK', { maximumFractionDigits: 1 })}
              body={m.line + ' · ' + m.col + ' · i ' + (m.section || 'memoet') + ' · "' + m.text + '"'}/>
          ))}
          {audit.deadDoc.map((d, i) => (
            <Row key={'d' + i} tone="bad" section={d.section}
              head={'Henviser til ' + d.doc + ', som ikke findes i sagen'}
              body={(d.section || 'memoet') + ' · "' + d.text + '"'}/>
          ))}
          {audit.deadPage.map((p, i) => (
            <Row key={'p' + i} tone="warn" section={p.section}
              head={'Henviser til "' + p.page + '" i ' + p.doc + ', som ikke findes'}
              body={'Dokumentet har: ' + (p.valid || []).join(', ')}/>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Viser kildedokumentet på den side en henvisning peger på. Den citerede
   passage fremhæves, hvis den kan findes i teksten, så man ikke skal lede. */
function SourceViewer({ doc, page, quote, onClose }) {
  const pages = doc.pages || [];
  const startIdx = Math.max(0, pages.findIndex(p => p.ref === page));
  const [idx, setIdx] = React.useState(startIdx);
  const cur = pages[idx];

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && idx < pages.length - 1) setIdx(idx + 1);
      if (e.key === 'ArrowLeft' && idx > 0) setIdx(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, pages.length, onClose]);

  // Find det tal eller den frase memoet henviser for, og fremhæv den
  const body = React.useMemo(() => {
    const text = cur ? cur.body : '';
    if (!quote) return [{ t: text, hit: false }];
    const needle = quote.replace(/\s+/g, ' ').trim();
    const nums = needle.match(/\d[\d.,]*/g) || [];
    const probes = [needle].concat(nums.filter(n => n.length >= 3));
    for (const p of probes) {
      const at = text.indexOf(p);
      if (at !== -1) {
        return [
          { t: text.slice(0, at), hit: false },
          { t: text.slice(at, at + p.length), hit: true },
          { t: text.slice(at + p.length), hit: false },
        ];
      }
    }
    return [{ t: text, hit: false }];
  }, [cur, quote]);

  const found = body.some(b => b.hit);

  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', zIndex: 9000, display: 'grid', placeItems: 'center', padding: 24 }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: 'min(860px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column',
          background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--c-line-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.FileText className="ic" style={{ color: 'var(--c-text-3)' }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{doc.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2 }}>{doc.type}{doc.meta ? ' · ' + doc.meta.split('·')[0].trim() : ''}</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>Luk</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {pages.map((p, i) => (
              <button
                key={p.ref}
                onClick={() => setIdx(i)}
                style={{
                  height: 24, padding: '0 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 11.5, fontWeight: 500,
                  border: '1px solid ' + (i === idx ? 'var(--c-ink)' : 'var(--c-line)'),
                  background: i === idx ? 'var(--c-ink)' : '#fff',
                  color: i === idx ? '#fff' : 'var(--c-text-2)',
                }}
              >{p.ref}</button>
            ))}
          </div>
        </div>

        {quote && (
          <div style={{
            padding: '9px 20px', background: found ? 'rgba(16,138,80,0.06)' : 'var(--c-warn-bg)',
            borderBottom: '1px solid ' + (found ? 'rgba(16,138,80,0.2)' : '#f4dfb7'),
            fontSize: 11.5, color: found ? 'var(--c-success)' : 'var(--c-warn)',
          }}>
            {found
              ? 'Memoet henviser for: "' + quote + '". Fremhævet nedenfor.'
              : 'Memoet henviser for: "' + quote + '". Den tekst kunne ikke findes ordret på denne side, gennemgå den selv.'}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)', marginBottom: 8 }}>
            {cur ? cur.ref + ' · ' + cur.title : ''}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.7, color: 'var(--c-ink)' }}>
            {body.map((b, i) => b.hit
              ? <mark key={i} style={{ background: '#fde68a', padding: '1px 2px', borderRadius: 3 }}>{b.t}</mark>
              : <span key={i}>{b.t}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function WSMemo() {
  const [active, setActive] = React.useState("summary");
  const [focusedKey, setFocusedKey] = React.useState(null);
  const [resets, setResets] = React.useState({});
  const [tooltip, setTooltip] = React.useState(null);
  const [citeOpen, setCiteOpen] = React.useState(false);
  const [citePos, setCitePos] = React.useState({ top: 0, left: 0 });
  const [persona, setPersona] = React.useState(() => localStorage.getItem('memo4-persona') || 'kredit');
  const [commentsVersion, setCommentsVersion] = React.useState(0);
  const [composerForKey, setComposerForKey] = React.useState(null);
  const [docScrollTop, setDocScrollTop] = React.useState(0);
  const [sectionOffsets, setSectionOffsets] = React.useState({});
  const scrollRef = React.useRef(null);
  const hoveredCiteRef = React.useRef(null);

  /* ── AI-tilstand ───────────────────────────────────────────────────────── */
  const aiStatus = window.MemoAI.useAiStatus();
  const [aiSettingsOpen, setAiSettingsOpen] = React.useState(false);
  const [aiSectionKey, setAiSectionKey] = React.useState(null);   // hvilket afsnit har assistenten åben
  const [aiSelection, setAiSelection] = React.useState(null);      // markeret passage der skal omskrives
  const [railTab, setRailTab] = React.useState('comments');        // højre skinne: kommentarer eller chat
  const [floatBtn, setFloatBtn] = React.useState(null);            // knappen der dukker op ved markering
  const [genOpen, setGenOpen] = React.useState(false);             // dialogen "Generér memo"
  const [gen, setGen] = React.useState(null);                      // status under generering
  const sectionApis = React.useRef({});
  const genAbort = React.useRef(null);

  const registerSectionApi = React.useCallback((k, api) => {
    if (api) sectionApis.current[k] = api;
    else delete sectionApis.current[k];
    // Gør afsnittene tilgængelige for de automatiske browsertests
    try { window.__memoApis = sectionApis.current; } catch (e) {}
  }, []);

  React.useEffect(() => { try { localStorage.setItem('memo4-persona', persona); } catch (e) {} }, [persona]);

  const commentCounts = React.useMemo(() => {
    const out = {};
    ['background','financing','rating','legal','risk','conclusion','ownership','product','market','financial','endorsement','appendix1','appendix2','appendix3']
      .forEach(k => { out[k] = loadComments(k).length; });
    return out;
  }, [commentsVersion]);

  // Track which sections have been manually edited (checked from localStorage on mount)
  const [modifiedSections, setModifiedSections] = React.useState(() => {
    const keys = ['background','financing','rating','legal','risk','conclusion','ownership','product','market','financial','endorsement','appendix1','appendix2','appendix3'];
    const m = {};
    keys.forEach(k => { if (localStorage.getItem('memo4:' + k) !== null) m[k] = true; });
    return m;
  });

  const sections = [
    { k: "background",  num: "1",  label: "Baggrund og formål",                              status: "ok"    },
    { k: "financing",   num: "2",  label: "Finansieringsstruktur",                           status: "ok"    },
    { k: "rating",      num: "3",  label: "Rating",                                          status: "ok"    },
    { k: "legal",       num: "4",  label: "Juridiske forhold",                               status: "ok"    },
    { k: "risk",        num: "5",  label: "Risikovurdering",                                 status: "warn"  },
    { k: "conclusion",  num: "6",  label: "Konklusion og indstilling",                       status: "draft" },
    { k: "ownership",   num: "7",  label: "Ejerstruktur, ledelse, bestyrelse og rådgivere",  status: "ok"    },
    { k: "product",     num: "8",  label: "Produkter, forretningsmodel og strategi",         status: "ok"    },
    { k: "market",      num: "9",  label: "Marked, konkurrence, kunder og leverandører",     status: "ok"    },
    { k: "financial",   num: "10", label: "Finansiel analyse",                               status: "warn"  },
    { k: "endorsement", num: "11", label: "Indstillings- og bevillingspåtegning",            status: "draft" },
    { k: "appendix1",   num: "B1", label: "Bilag 1 – Vilkår",                                status: "warn"  },
    { k: "appendix2",   num: "B2", label: "Bilag 2 – ESG",                                   status: "draft" },
    { k: "appendix3",   num: "B3", label: "Bilag 3 – Koncerndiagram",                        status: "draft" },
  ];

  function scrollTo(key) {
    setActive(key);
    const el = document.getElementById('ms-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleAddComment(key) {
    setComposerForKey(key);
    setActive(key);
  }

  function openCitePicker(pos) {
    setCitePos(pos);
    setCiteOpen(true);
  }

  function insertCiteDoc(doc) {
    const editable = _memoLastEditable ||
      (active ? document.getElementById('ms-' + active)?.querySelector('[contenteditable]') : null);
    if (!editable) { setCiteOpen(false); return; }

    editable.focus();

    const sel = window.getSelection();
    if (_memoLastRange) {
      sel.removeAllRanges();
      sel.addRange(_memoLastRange);
    }

    // Use the selected text as the visible label; fall back to doc name if nothing was selected
    const selectedText = (_memoLastRange && _memoLastRange.toString().trim()) || doc.name;
    const html = '<span class="memo-cite" data-doc="' + doc.name + '" data-page="" data-manual="true">' + selectedText + '</span>';
    document.execCommand('insertHTML', false, html);
    setCiteOpen(false);
  }

  React.useEffect(() => {
    if (!citeOpen) return;
    const close = () => setCiteOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [citeOpen]);

  function handleFocusSection(key, isModified) {
    setFocusedKey(key && isModified ? key : null);
    if (key) {
      setActive(key);
      if (isModified) setModifiedSections(prev => ({ ...prev, [key]: true }));
    }
  }

  function resetSection(key) {
    setResets(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    setFocusedKey(null);
    setModifiedSections(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  // Auto-highlight nav on scroll
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const els = sections.map(s => document.getElementById('ms-' + s.k)).filter(Boolean);
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) {
        const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        setActive(top.target.id.replace('ms-', ''));
      }
    }, { root, threshold: 0.1, rootMargin: '0px 0px -45% 0px' });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Measure each section's absolute offset within the document scroll container,
  // re-run when comments change (which can shift heights).
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const measure = () => {
      const rootRect = root.getBoundingClientRect();
      const map = {};
      sections.forEach(s => {
        const el = document.getElementById('ms-' + s.k);
        if (el) {
          const r = el.getBoundingClientRect();
          map[s.k] = r.top - rootRect.top + root.scrollTop;
        }
      });
      setSectionOffsets(map);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [commentsVersion]);

  function handleDocScroll(e) {
    setDocScrollTop(e.currentTarget.scrollTop);
    if (floatBtn) setFloatBtn(null);
  }

  /* ── Markering i teksten giver en flydende "omskriv"-knap ──────────────── */
  React.useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setFloatBtn(null); return; }
      let node = sel.anchorNode;
      const el = node && (node.nodeType === 3 ? node.parentElement : node);
      const body = el && el.closest ? el.closest('.memo-body') : null;
      const sec = body && body.closest ? body.closest('[id^="ms-"]') : null;
      if (!body || !sec) { setFloatBtn(null); return; }
      const text = sel.toString().trim();
      if (text.length < 8) { setFloatBtn(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r || (!r.width && !r.height)) { setFloatBtn(null); return; }
      setFloatBtn({ sKey: sec.id.replace('ms-', ''), text, x: r.left + r.width / 2, y: r.top });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  function openSectionAi(key) {
    setAiSelection(null);
    setAiSectionKey(prev => (prev === key ? null : key));
  }

  function openSelectionAi() {
    if (!floatBtn) return;
    _memoSaveSelection();
    // Markeringen fryses her sammen med hvilket afsnit den kom fra. Ellers
    // overskriver et klik i et andet afsnit den, mens AI'en skriver, og
    // resultatet lander det forkerte sted.
    const sel = window.getSelection();
    const frozen = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : _memoLastRange;
    setAiSelection({ text: floatBtn.text, range: frozen, sKey: floatBtn.sKey });
    setAiSectionKey(floatBtn.sKey);
    setFloatBtn(null);
  }

  function closeSectionAi() { setAiSectionKey(null); setAiSelection(null); }

  /* ── Chat ──────────────────────────────────────────────────────────────── */

  function memoAsText() {
    return sections.map(s => {
      const api = sectionApis.current[s.k];
      const body = api ? api.getText().trim() : '';
      return '## ' + s.num + '. ' + s.label + '\n' + (body || '(ikke skrevet endnu)');
    }).join('\n\n');
  }

  /* ── Kontrol af hele memoet ────────────────────────────────────────────────
     Kildehenvisninger og tal ser lige rigtige ud om de er det eller ej, så de
     kan ikke fanges ved gennemlæsning. Her sammenholdes de med de dokumenter
     og den regnskabstabel appen allerede kender. */

  const [audit, setAudit] = React.useState(null);

  function runAudit() {
    if (audit) { setAudit(null); return; }
    const parts = sections.map(s => {
      const api = sectionApis.current[s.k];
      return { key: s.k, title: s.num + '. ' + s.label, html: api ? api.getHtml() : '' };
    });
    setAudit(auditMemo(parts));
  }

  // Kontrollen gælder kun den tekst der stod da den blev kørt
  React.useEffect(() => { setAudit(null); }, [modifiedSections]);

  function insertFromChat(key, html) {
    const api = sectionApis.current[key];
    if (!api || !html) return;
    // Tekst fra chatten er også maskinskrevet. Før blev den indsat helt umærket,
    // så den var ikke til at skelne fra rådgiverens egen bagefter.
    api.append(window.MemoAI.markAsDraft(html, 'chat'), 'chat');
    scrollTo(key);
    setModifiedSections(prev => ({ ...prev, [key]: true }));
  }

  /* ── Generér hele memoet ───────────────────────────────────────────────── */

  async function runGeneration(keys) {
    const ctrl = new AbortController();
    genAbort.current = ctrl;
    setGenOpen(false);
    setGen({ keys, index: 0, label: '', running: true, error: null, written: [] });

    for (let i = 0; i < keys.length; i++) {
      if (ctrl.signal.aborted) break;
      const s = sections.find(x => x.k === keys[i]);
      if (!s) continue;
      setGen(g => ({ ...g, index: i, label: s.label }));
      scrollTo(s.k);

      const api = sectionApis.current[s.k];
      const p = window.MemoAI.writeSectionPrompt(s.k, s.label, s.num);
      let lastPaint = 0;
      // Ét snapshot per afsnit, taget før streamingen begynder at male
      if (api && api.snapshot) api.snapshot('write');

      try {
        const res = await window.AI.stream({
          system: p.system,
          messages: [{ role: 'user', content: p.content }],
          maxTokens: 20000,
          effort: 'high',
          signal: ctrl.signal,
          onDelta: (_d, all) => {
            // Mal med i takt med at teksten kommer, men ikke oftere end øjet kan følge
            const now = Date.now();
            if (api && now - lastPaint > 140) {
              lastPaint = now;
              try { api.paint(window.MemoAI.markAsDraft(window.MemoAI.cleanHtml(all))); } catch (e) {}
            }
          },
        });
        const html = window.MemoAI.cleanHtml(res.text);
        // Tomt svar må ikke overskrive afsnittet. Rul tilbage til det der stod.
        if (!html.trim()) {
          if (api && api.undo) api.undo();
          setGen(g => ({ ...g, skipped: (g.skipped || []).concat([s.label]) }));
          continue;
        }
        if (api) api.commit(window.MemoAI.markAsDraft(html));
        setGen(g => ({ ...g, written: g.written.concat([s.k]) }));
        setModifiedSections(prev => ({ ...prev, [s.k]: true }));
      } catch (e) {
        if (e && e.code === 'abort') break;
        setGen(g => ({ ...g, error: e.message || String(e), running: false }));
        genAbort.current = null;
        return;
      }
    }

    genAbort.current = null;
    setGen(g => (g ? { ...g, running: false, finished: true } : null));
  }

  function stopGeneration() {
    if (genAbort.current) genAbort.current.abort();
    genAbort.current = null;
    setGen(g => (g ? { ...g, running: false, finished: true } : null));
  }

  // Cite tooltip via event delegation
  function computeTooltip(el) {
    if (!el) return null;
    const isManual = el.dataset.manual === 'true';
    let isEdited = false;
    if (!isManual) {
      const sectionEl = el.closest('[id^="ms-"]');
      const sKey = sectionEl ? sectionEl.id.replace('ms-', '') : null;
      if (sKey && SEC[sKey]) {
        const tmp = document.createElement('div');
        tmp.innerHTML = SEC[sKey];
        const origSpans = tmp.querySelectorAll('.memo-cite');
        const currentText = el.textContent.trim();
        let foundUnchanged = false;
        origSpans.forEach(s => { if (s.textContent.trim() === currentText) foundUnchanged = true; });
        isEdited = !foundUnchanged;
      }
    }
    const r = el.getBoundingClientRect();
    return { doc: el.dataset.doc, page: el.dataset.page, x: r.left + r.width / 2, y: r.top, manual: isManual, edited: isEdited };
  }

  const handleMouseOver = (e) => {
    const el = e.target.closest('.memo-cite');
    if (el) { hoveredCiteRef.current = el; setTooltip(computeTooltip(el)); }
  };
  const handleMouseOut = (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.memo-cite')) {
      hoveredCiteRef.current = null;
      setTooltip(null);
    }
  };
  const handleScrollInput = () => {
    if (hoveredCiteRef.current) setTooltip(computeTooltip(hoveredCiteRef.current));
  };

  /* Klik på en kildehenvisning åbner selve dokumentet på den side der henvises
     til. Et tooltip der viser et filnavn er en påstand; kilden er beviset, og
     hele pointen med sporbarheden er at man kan komme hen til den. */
  const [sourceDoc, setSourceDoc] = React.useState(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [showOrigin, setShowOrigin] = React.useState(false);

  /* Dokumentet skal fylde resten af vinduet. Et fast fratræk holder ikke, fordi
     værktøjslinjen ombryder når der kommer en knap mere, og ophavslinjen kan
     være slået til. Derfor måles den faktiske afstand fra toppen. */
  const [docHeight, setDocHeight] = React.useState('max(460px, calc(100vh - 344px))');
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = scrollRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setDocHeight(Math.max(460, Math.round(window.innerHeight - top - 24)) + 'px');
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 250);
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [showOrigin, gen, audit]);

  /* Ophavsmærkerne bærer deres etiket i en attribut, så CSS kan vise den.
     Sættes når visningen slås til, og efter at AI'en har skrevet. */
  React.useEffect(() => {
    if (!showOrigin) return;
    const t = setTimeout(() => {
      document.querySelectorAll('.memo-doc [data-ai]').forEach(el => {
        const o = el.getAttribute('data-ai');
        el.setAttribute('data-ai-label', o === 'edited' ? 'AI, rettet' : o === 'chat' ? 'AI, chat' : 'AI');
      });
    }, 60);
    return () => clearTimeout(t);
  }, [showOrigin, focusedKey]);

  /* Hvor meget af memoet står maskinen bag? Tælles på blokke, ikke på tegn,
     fordi det er den enhed rådgiveren godkender. */
  const originStats = React.useMemo(() => {
    if (!showOrigin) return null;
    let ai = 0, edited = 0, own = 0;
    sections.forEach(s => {
      const api = sectionApis.current[s.k];
      if (!api) return;
      const d = document.createElement('div');
      d.innerHTML = api.getHtml();
      d.querySelectorAll('p, h3, h4, ul, ol, table, blockquote').forEach(el => {
        const marked = el.closest('[data-ai]');
        if (!marked) { own++; return; }
        if (el !== marked && marked.contains(el) && el.parentElement !== marked) return;
        const o = marked.getAttribute('data-ai');
        if (o === 'edited') edited++; else ai++;
      });
    });
    return { ai, edited, own, total: ai + edited + own };
  }, [showOrigin, focusedKey, commentsVersion]);

  const handleCiteClick = (e) => {
    const el = e.target.closest('.memo-cite');
    if (!el) return;
    // Ctrl eller cmd holdt nede betyder at brugeren vil redigere teksten
    if (e.metaKey || e.ctrlKey) return;
    const name = el.getAttribute('data-doc');
    const page = el.getAttribute('data-page');
    const doc = (window.CASE_DOCS || []).find(d => d.name === name);
    if (!doc) return;
    e.preventDefault();
    setSourceDoc({ doc, page, quote: (el.textContent || '').trim() });
  };


  return (
    <div className="page page-wide" style={{ maxWidth: 1320 }}>
      <div className="grid" style={{ gridTemplateColumns: '256px 1fr 272px', gap: 16 }}>

        {/* ── Nav ── */}
        <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div className="card-title">Sektioner</div>
            <span className="tag" style={{ fontSize: 10 }}>68%</span>
          </div>
          <div style={{ padding: '6px 0 10px' }}>
            {sections.map(s => (
              <button key={s.k} onClick={() => scrollTo(s.k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 16px',
                  background: active === s.k ? 'var(--c-surface-2)' : 'transparent',
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  fontSize: 12.5, color: active === s.k ? 'var(--c-ink)' : 'var(--c-text-2)',
                  borderLeft: '2px solid ' + (active === s.k ? 'var(--c-ink)' : 'transparent'),
                  transition: 'all 0.1s',
                }}>
                <SectionDot status={s.status}/>
                <span style={{ flex: 1 }}>{s.label}</span>
                {commentCounts[s.k] > 0 && (
                  <span
                    title={`${commentCounts[s.k]} kommentar${commentCounts[s.k] === 1 ? '' : 'er'}`}
                    style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--c-primary)',
                      background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
                      borderRadius: 999, padding: '0 7px', lineHeight: '15px', minWidth: 16, textAlign: 'center',
                    }}
                  >
                    {commentCounts[s.k]}
                  </span>
                )}
                <span className="mono" style={{ fontSize: 10, color: 'var(--c-text-4)' }}>{s.num}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Document ── */}
        <div className="card" style={{ background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar */}
          <div className="card-head" style={{ flexShrink: 0, borderBottom: '1px solid var(--c-line-2)' }}>
            <div style={{ minWidth: 0 }}>
              <div className="card-title">Credit memo · udkast</div>
              <div className="card-sub" style={{ whiteSpace: 'nowrap' }}>Klik i teksten for at redigere</div>
            </div>
            <div className="hstack" style={{ gap: 6, flexShrink: 0 }}>
              <button
                className="btn btn-sm"
                onClick={() => setAiSettingsOpen(true)}
                title={aiStatus.ready
                  ? 'Forbundet til ' + aiStatus.provider.label + ' (' + aiStatus.model + '). Klik for at skifte.'
                  : 'Forbind din egen Claude- eller ChatGPT-konto'}
                style={aiStatus.ready ? undefined : { borderColor: 'var(--c-primary)', color: 'var(--c-primary)' }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', marginRight: 6, display: 'inline-block',
                  background: aiStatus.ready ? 'var(--c-success)' : 'var(--c-text-4)',
                }}/>
                {aiStatus.ready ? aiStatus.provider.label : 'Forbind AI'}
              </button>
              <button
                className="btn btn-sm"
                disabled={!aiStatus.ready || (gen && gen.running)}
                onClick={() => setGenOpen(true)}
                title="Lad AI skrive memoet ud fra dokumenterne, periodetallene og årsregnskaberne"
              >Generér memo</button>
              <button
                className="btn btn-sm"
                onClick={runAudit}
                title="Tjek hele memoet for kildehenvisninger der ikke findes, og tal der ikke stemmer med regnskabstabellen"
                style={audit && audit.count ? { borderColor: 'var(--c-warn)', color: 'var(--c-warn)' } : undefined}
              >
                {audit
                  ? (audit.count ? audit.count + ' fund' : 'Kontrol ok')
                  : 'Kontrollér'}
              </button>
              <button
                className="btn btn-sm"
                onClick={() => setShowOrigin(v => !v)}
                aria-pressed={showOrigin}
                title="Vis hvilke afsnit maskinen har skrevet, og hvilke du selv står bag"
                style={showOrigin ? { borderColor: 'var(--c-ink)', background: 'var(--c-ink)', color: '#fff' } : undefined}
              >
                {showOrigin ? 'Skjul ophav' : 'Vis ophav'}
              </button>
              <button className="btn btn-sm btn-ghost" title="Download som PDF"><I.Download className="ic"/> PDF</button>
              <button
                className="btn btn-sm btn-primary"
                title="Hent kreditindstillingen som Word-fil"
                onClick={() => setExportOpen(true)}
              >
                <I.Download className="ic"/> Word
              </button>
            </div>
          </div>

          {/* Resultat af kontrollen */}
          {audit && <AuditPanel audit={audit} onClose={() => setAudit(null)} onGoto={scrollTo} sections={sections}/>}
          {exportOpen && <ExportDialog sections={sections} onClose={() => setExportOpen(false)}/>}
          {sourceDoc && (
            <SourceViewer
              doc={sourceDoc.doc}
              page={sourceDoc.page}
              quote={sourceDoc.quote}
              onClose={() => setSourceDoc(null)}
            />
          )}

          {/* Fremgang under generering */}
          {gen && (
            <div className="ai-progress">
              <span className="ai-chip">AI</span>
              {gen.error ? (
                <span style={{ color: '#b03030', flex: 1 }}>{gen.error}</span>
              ) : gen.running ? (
                <>
                  <span style={{ minWidth: 210 }}>Skriver {gen.index + 1} af {gen.keys.length}: {gen.label}</span>
                  <span className="ai-progress-bar"><span style={{ width: Math.round((gen.index / gen.keys.length) * 100) + '%' }}/></span>
                  <button className="btn btn-sm" onClick={stopGeneration}>Stop</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>
                    {gen.written.length} af {gen.keys.length} afsnit skrevet. Gennemgå teksten og ret det der skal rettes.
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setGen(null)}>Luk</button>
                </>
              )}
            </div>
          )}

          {/* Toolbar */}
          <MemoToolbar focusedKey={focusedKey} citeOpen={citeOpen} onOpenCitePicker={openCitePicker} onReset={resetSection}/>

          {showOrigin && originStats && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              padding: '9px 20px', borderBottom: '1px solid var(--c-line-2)',
              background: 'var(--c-surface-2)', fontSize: 12, color: 'var(--c-text-2)',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 13, background: '#7c8cf8', borderRadius: 2 }}/>
                {originStats.ai} afsnit skrevet af AI og ikke rørt siden
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 13, background: '#b9c0cc', borderRadius: 2 }}/>
                {originStats.edited} skrevet af AI og rettet af dig
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 13, background: 'transparent', border: '1px solid var(--c-line-strong)', borderRadius: 2 }}/>
                {originStats.own} skrevet af dig
              </span>
              <span style={{ flex: 1 }}/>
              <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>
                Ophavet følger teksten og forsvinder ikke når du retter i den.
              </span>
            </div>
          )}

          {/* Scrollable doc body */}
          <div
            ref={scrollRef}
            /* Dokumentet er 14 afsnit langt og blev læst gennem et fast 660px
               højt vindue, uanset hvor stor skærmen var. Nu fylder det den plads
               der faktisk er: 344px er hvad topbjælke, sagshoved, faner og
               værktøjslinje optager over det. Så slipper man også for at scrolle
               siden for at nå ned til en kasse man skal scrolle i igen. */
            className={'memo-doc' + (showOrigin ? ' show-origin' : '')}
            style={{ padding: '36px 56px 60px', height: docHeight, overflowY: 'auto' }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onInput={handleScrollInput}
            onScroll={handleDocScroll}
            onClick={handleCiteClick}
          >
            {/* Doc header (non-editable) — følger EIFO Kreditindstilling-template */}
            <div style={{ borderBottom: '2px solid var(--c-ink)', paddingBottom: 18, marginBottom: 28 }}>
              <div className="label-mini" style={{ marginBottom: 4 }}>Kreditindstilling</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>Nordhavn Composite A/S</div>
              <div style={{ fontSize: 14, color: 'var(--c-ink)', marginTop: 10, lineHeight: 1.6 }}>
                Indstilling af <span className="tpl-pill">nyt engagement</span> til <span className="tpl-pill">Kreditkomité</span>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12.5, color: 'var(--c-text-2)' }}>
                <span>Kreditrisiko: <span className="tpl-pill warn">Middel/Høj</span></span>
                <span>Kundetype: <span className="tpl-pill">Erhverv – SMV</span></span>
              </div>

              {/* Virksomhed-tabel: 2-kolonne som i EIFO-template */}
              <div style={{ marginTop: 16, fontSize: 11, fontWeight: 600, color: 'var(--c-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Virksomhed</div>
              <table style={{ width: '100%', marginTop: 6, fontSize: 12, borderCollapse: 'collapse', border: '1px solid var(--c-line)' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--c-line)', verticalAlign: 'top', width: '50%' }}>
                      <div style={{ color: 'var(--c-text-3)', fontSize: 11, marginBottom: 2 }}>EIFO direkte investering / ejerandel</div>
                      <div style={{ color: 'var(--c-text-4)', fontStyle: 'italic', fontSize: 11.5 }}>Ikke relevant for denne sag.</div>
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 4, columnGap: 8 }}>
                        <span style={{ color: 'var(--c-text-3)' }}>Dato:</span><span style={{ color: 'var(--c-ink)' }}>24. maj 2026</span>
                        <span style={{ color: 'var(--c-text-3)' }}>CVR:</span><span style={{ color: 'var(--c-ink)', fontFamily: 'var(--mono)' }}>38 42 71 56</span>
                        <span style={{ color: 'var(--c-text-3)' }}>Branche:</span><span style={{ color: 'var(--c-ink)' }}>Vindmøllekomponenter / komposit</span>
                      </div>
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--c-line)' }}>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--c-line)', verticalAlign: 'top' }}>
                      <div style={{ color: 'var(--c-text-3)', fontSize: 11, marginBottom: 2 }}>Dispensation fra acceptkriterie</div>
                      <div style={{ color: 'var(--c-ink)' }}>Ingen</div>
                      <div style={{ color: 'var(--c-text-4)', fontStyle: 'italic', fontSize: 11, marginTop: 4 }}>(Maks. to linjer med kreditmæssig begrundelse ved evt. dispensation)</div>
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 4, columnGap: 8 }}>
                        <span style={{ color: 'var(--c-text-3)' }}>Sagsnr.:</span><span style={{ color: 'var(--c-ink)' }}>2026-0184</span>
                        <span style={{ color: 'var(--c-text-3)' }}>Primær:</span><span style={{ color: 'var(--c-ink)' }}>Mette Larsen, Kredit</span>
                        <span style={{ color: 'var(--c-text-3)' }}>Sekundær:</span><span style={{ color: 'var(--c-ink)' }}>Sofie Andersen, Erhverv</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {sections.map(s => (
              <MemoSection
                key={s.k}
                id={'ms-' + s.k}
                sKey={s.k}
                num={s.num}
                title={s.label}
                status={s.status}
                onFocusSection={handleFocusSection}
                resetTrigger={resets[s.k] || 0}
                onAddComment={handleAddComment}
                commentCount={commentCounts[s.k] || 0}
                registerApi={registerSectionApi}
                aiOpen={aiSectionKey === s.k}
                aiSelection={aiSectionKey === s.k ? aiSelection : null}
                onToggleAi={openSectionAi}
                onCloseAi={closeSectionAi}
              />
            ))}
          </div>
        </div>

        {/* ── Højre skinne: kommentarer eller sagschat ── */}
        <div style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[
              { k: 'comments', l: 'Kommentarer', n: Object.values(commentCounts).reduce((a, b) => a + b, 0) },
              { k: 'ai', l: 'Spørg om sagen', n: 0 },
            ].map(t => {
              const on = railTab === t.k;
              return (
                <button key={t.k} onClick={() => setRailTab(t.k)}
                  style={{
                    flex: 1, height: 30, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
                    border: '1px solid ' + (on ? 'var(--c-ink)' : 'var(--c-line)'),
                    background: on ? 'var(--c-ink)' : '#fff',
                    color: on ? '#fff' : 'var(--c-text-2)',
                    fontSize: 12, fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {t.l}
                  {t.n > 0 && <span style={{ fontSize: 10, opacity: on ? 0.75 : 0.6 }}>{t.n}</span>}
                </button>
              );
            })}
          </div>

          {railTab === 'comments' ? (
            <MemoCommentsRail
              sections={sections}
              sectionOffsets={sectionOffsets}
              scrollTop={docScrollTop}
              persona={persona}
              onPersonaChange={setPersona}
              activeKey={active}
              composerForKey={composerForKey}
              onComposerToggle={setComposerForKey}
              onChanged={() => setCommentsVersion(v => v + 1)}
              scrollToSection={scrollTo}
              totalCount={Object.values(commentCounts).reduce((a, b) => a + b, 0)}
            />
          ) : (
            <window.MemoAI.AiChatPanel
              open
              onClose={() => setRailTab('comments')}
              getMemoText={memoAsText}
              sections={sections}
              onInsert={insertFromChat}
            />
          )}
        </div>

      </div>

      {/* Flydende knap ved markeret tekst */}
      {floatBtn && aiStatus.ready && (
        <button
          className="ai-float"
          style={{ left: floatBtn.x, top: floatBtn.y - 10, transform: 'translate(-50%, -100%)' }}
          onMouseDown={(e) => { e.preventDefault(); openSelectionAi(); }}
        >
          <span className="ai-chip" style={{ background: 'rgba(255,255,255,0.2)' }}>AI</span>
          Omskriv markeringen
        </button>
      )}

      {/* Forbindelsesdialog */}
      <window.MemoAI.AiSettingsDialog open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)}/>

      {/* Generér memo */}
      {genOpen && (
        <GenerateMemoDialog
          sections={sections}
          modified={modifiedSections}
          onCancel={() => setGenOpen(false)}
          onStart={runGeneration}
        />
      )}

      {/* Cite picker -fixed overlay, outside any overflow:hidden ancestor */}
      {citeOpen && (
        <div
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
          style={{
            position: 'fixed', top: citePos.top, left: citePos.left,
            width: 340, background: '#fff',
            border: '1px solid var(--c-line-strong)', borderRadius: 8,
            boxShadow: '0 8px 28px rgba(0,0,0,0.14)', zIndex: 9999,
            maxHeight: 320, overflowY: 'auto',
          }}
        >
          <div style={{ padding: '8px 14px 6px', fontSize: 10.5, color: 'var(--c-text-3)', fontWeight: 600, letterSpacing: '0.05em', borderBottom: '1px solid var(--c-line-2)' }}>
            DOKUMENTER I SAGEN
          </div>
          {DATA.DOCS.map(doc => (
            <div
              key={doc.name}
              onMouseDown={() => insertCiteDoc(doc)}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 12.5, display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--c-line-2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ flexShrink: 0, fontSize: 10.5, color: 'var(--c-text-3)', background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 4, padding: '1px 5px' }}>{doc.type}</span>
              <span style={{ flex: 1, color: 'var(--c-ink)' }}>{doc.name}</span>
              {doc.year && <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{doc.year}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Cite tooltip -fixed so it's not clipped */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 8,
          transform: 'translateX(-50%) translateY(-100%)',
          background: '#1a1d22', color: '#fff',
          fontSize: 11, padding: '7px 11px', borderRadius: 7,
          zIndex: 9999, pointerEvents: 'none',
          whiteSpace: 'nowrap', lineHeight: 1.5,
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
        }}>
          <div style={{ fontWeight: 600 }}>{tooltip.doc}</div>
          {tooltip.page && <div style={{ opacity: 0.72, fontSize: 10.5 }}>{tooltip.page}</div>}
          {(tooltip.manual || tooltip.edited) && (
            <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 10, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 4 }}>
              {tooltip.manual
                ? <><span style={{ opacity: 0.6 }}>✎</span> Tilføjet manuelt</>
                : <><span style={{ opacity: 0.6 }}>✎</span> Afsnit redigeret af bruger</>
              }
            </div>
          )}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '5px solid transparent', borderTopColor: '#1a1d22' }}/>
        </div>
      )}
    </div>
  );
}

window.WSMemo = WSMemo;
