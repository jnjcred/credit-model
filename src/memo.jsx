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
    .memo-body blockquote { margin: 0; padding: 2px 0 2px 14px; border-left: 2px solid var(--c-line-strong); font-size: 13px; }
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
    .memo-tbl-lbl { font-size: 11px; color: rgba(255,255,255,0.6); margin-right: 4px; }
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
      font-size: 11px;
      color: var(--c-text-3); pointer-events: none;
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
    .memo-body .tpl-note { font-size: 12px; color: var(--c-text-3); font-style: italic; margin-top: 4px; }
    /* Skabelonens vejledning foldes, når afsnittet har tekst. "Vejledning (n)"
       i afsnittets overskrift viser den igen. Tomme afsnit viser den altid. */
    .memo-sec.guide-folded .memo-body .tpl-hints, .memo-sec.guide-folded .memo-body .tpl-hint,
    .memo-sec.guide-folded .memo-body .tpl-note, .memo-sec.guide-folded .memo-body .tpl-guide { display: none; }
    .memo-body .tpl-subhead { font-size: 13.5px; font-weight: 600; color: var(--c-ink); margin: 18px 0 6px; padding-top: 8px; border-top: 1px dashed var(--c-line); letter-spacing: -0.005em; }
    .memo-body .tpl-subhead:first-child { padding-top: 0; border-top: 0; margin-top: 0; }
    /* Udkastblokke ser ud som den øvrige tekst på skærmen. Mærket og klassen
       bliver i teksten, så Word-eksporten og "Vis ophav" virker som før;
       afsnittets status står i gennemgangslinjen og i navigationens prik. */
    .memo-body .tpl-draft { margin: 6px 0; }
    .memo-body .tpl-draft-label { display: none; }
    .memo-body .tpl-bevtable { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .memo-body .tpl-bevtable th { background: var(--c-ink); color: #fff; padding: 7px 10px; font-size: 12px; font-weight: 600; text-align: left; }
    .memo-body .tpl-bevtable td { padding: 8px 10px; border-bottom: 1px solid var(--c-line-2); font-size: 12px; vertical-align: top; }
    .memo-body .tpl-bevtable td.label { color: var(--c-text-3); font-size: 11px; width: 130px; }
    /* Risikovurderingen er et valgfelt som de andre: samme neutrale chip, uanset
       niveau. Niveauet står i teksten (lav, middel, høj). Klasserne lav/mid/hoj
       bliver i teksten, men giver ikke længere farve. */
    .memo-body .tpl-risk { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--c-surface-2); color: var(--c-ink); margin-left: 6px; border: 1px solid var(--c-line-strong); }
    .tpl-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--c-surface-2); border: 1px solid var(--c-line-strong); color: var(--c-ink); font-weight: 600; font-size: 12px; }
    .memo-tb { display: inline-flex; align-items: center; justify-content: center; height: 26px; min-width: 26px; padding: 0 6px; border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer; font-size: 13px; font-family: inherit; color: var(--c-text-2); transition: all 0.1s; flex-shrink: 0; }
    .memo-tb:hover { background: var(--c-surface-2); border-color: var(--c-line); color: var(--c-ink); }
    .memo-tb.on { background: var(--c-line-2); color: var(--c-ink); border-color: var(--c-line-strong); }
    .memo-tb-sep { width: 1px; height: 18px; background: var(--c-line); margin: 0 2px; flex-shrink: 0; display: inline-block; }

    /* ── Comments (right rail) ── */
    .memo-cmt-group { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; background: var(--c-surface); border-top: 1px solid var(--c-line-2); border-bottom: 1px solid var(--c-line-2); }
    .memo-cmt-group.active { background: var(--c-surface-2); }
    .memo-cmt-group-head { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: var(--c-text-2); font-weight: 500; }
    .memo-cmt-group-head .num { color: var(--c-text-3); font-weight: 400; }
    .memo-cmt-group-head .ttl { color: var(--c-text-2); flex: 1; min-width: 0; cursor: pointer; }
    .memo-cmt-group-head .ttl:hover { color: var(--c-ink); }
    .memo-cmt-add { background: transparent; border: 0; padding: 0 4px; height: 22px; border-radius: 5px; cursor: pointer; color: var(--c-text-2); font-size: 12px; font-weight: 400; font-family: inherit; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
    .memo-cmt-add:hover { color: var(--c-ink); background: var(--c-surface-2); }
    .memo-cmt { display: flex; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid var(--c-line-2); border-radius: 8px; box-shadow: 0 1px 2px rgba(15,17,20,0.03); }
    .memo-cmt-body { flex: 1; min-width: 0; }
    .memo-cmt-meta { display: flex; align-items: baseline; gap: 4px; font-size: 12px; color: var(--c-text-3); margin-bottom: 2px; flex-wrap: wrap; }
    .memo-cmt-meta b { color: var(--c-ink); font-weight: 600; font-size: 12px; }
    /* Afdelingen er grå tekst efter navnet: "Jonas Holm · Compliance" */
    .memo-cmt-dept { font-size: 12px; color: var(--c-text-3); }
    .memo-cmt-time { font-size: 12px; color: var(--c-text-3); }
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
      background: #fff; color: var(--c-text-2);
      border: 1px solid var(--c-line-strong); border-radius: 50%;
      cursor: pointer; opacity: 0;
      transition: opacity 0.12s ease;
      font-size: 14px; font-weight: 500; line-height: 1; font-family: inherit;
      z-index: 3;
    }
    .memo-sec:hover .memo-sec-add, .memo-sec-add:focus-visible { opacity: 1; }
    .memo-sec-add:hover { color: var(--c-ink); border-color: var(--c-ink); }

    /* "Skriv med AI" vises kun, når man holder over afsnittet, står i det
       (fokus) eller det er det aktive afsnit. Ellers stod den 14 gange. */
    .memo-sec .memo-sec-ai { opacity: 0; border-color: var(--c-line-2); color: var(--c-text-3); background: transparent; white-space: nowrap; }
    .memo-sec:hover .memo-sec-ai, .memo-sec:focus-within .memo-sec-ai, .memo-sec.active .memo-sec-ai,
    .memo-sec .memo-sec-ai:focus-visible, .memo-sec .memo-sec-ai.on { opacity: 1; }
    .memo-sec .memo-sec-ai:hover, .memo-sec .memo-sec-ai.on { border-color: var(--c-ink); color: var(--c-ink); background: #fff; }
    .memo-sec > .ai-panel { margin: 0 0 14px 28px; }

    /* Etiketten står over blokken i stedet for oven i teksten */
    .memo-doc.show-origin .memo-body > [data-ai] { margin-top: 18px; }
    .memo-doc.show-origin .memo-body > [data-ai]::after { top: -15px; right: 0; }
    /* Udkast der ikke er gennemgået, og gennemgået tekst, i ophavsvisningen */
    .memo-doc.show-origin [data-ai="seed"] { border-left-color: #7c8cf8; background: rgba(124,140,248,0.05); }
    .memo-doc.show-origin .memo-sec[data-reviewed="1"] [data-ai] { border-left-color: var(--c-success); background: rgba(16,138,80,0.04); }

    /* Gennemgang pr. afsnit: en stille række under teksten. Grå status til
       venstre, ghost-knap til højre. Forklaringen står én gang i memoets top. */
    .memo-review { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 12px 0 0 28px; padding: 6px 0 0; border-top: 1px solid var(--c-line-2); font-size: 12.5px; line-height: 1.45; color: var(--c-text-3); outline: none; }
    .memo-review .rv-text { flex: 1; min-width: 180px; }
    .memo-review .rv-text b { font-weight: 500; color: var(--c-text-2); }
    .memo-review:focus-visible .rv-text { text-decoration: underline; text-underline-offset: 3px; }

    /* Statusprik i sektionsoversigten: form og tegn ud over farve */
    .memo-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; display: inline-grid; place-items: center; font-size: 9px; font-weight: 700; line-height: 1; box-sizing: border-box; }
    /* Neutrale prikker: gennemgået er udfyldt gråt med flueben, udkast er en
       grå ring. Kun tomme felter i et gennemgået afsnit har farve (skal handles). */
    .memo-dot.done  { background: var(--c-text-3); color: #fff; }
    .memo-dot.blanks { border: 1.5px solid var(--c-warn); color: var(--c-warn); background: #fff; }
    .memo-dot.draft { border: 1.5px solid var(--c-text-3); color: var(--c-text-3); background: #fff; }
    .memo-dot.empty { border: 1.5px dashed var(--c-text-4); color: var(--c-text-4); background: #fff; }
    .memo-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

    /* Layout: tre kolonner, men dokumentet får mest muligt af pladsen på
       almindelige bærbare (1280 til 1480 px). */
    .memo-layout { display: grid; grid-template-columns: 256px minmax(0, 1fr) 272px; gap: 16px; }
    .memo-doc { padding: 36px 56px 60px; overflow-x: hidden; }
    @media (max-width: 1480px) {
      .memo-layout { grid-template-columns: 208px minmax(0, 1fr) 244px; gap: 14px; }
      .memo-doc { padding: 28px 28px 56px; }
    }
    /* Under ca. 1440 px klappes kommentarpanelet sammen til en knap i kanten,
       så dokumentet får pladsen. Før var memoet 480 px bredt ved 1280 px. */
    @media (max-width: 1439px) {
      .memo-layout { grid-template-columns: 196px minmax(0, 1fr) 40px; gap: 12px; }
      .memo-doc { padding: 26px 24px 56px; }
    }
    .memo-doc .memo-body { overflow-wrap: anywhere; }
    .memo-doc .memo-body table { table-layout: auto; }
    /* Tegnede diagrammer (koncerndiagram) kan ikke ombrydes. De ruller i
       deres egen boks i stedet for at give hele dokumentet en vandret rullebjælke. */
    .memo-doc .memo-body pre { max-width: 100%; overflow-x: auto; box-sizing: border-box; }

    /* Kildehenvisninger kan nås med Tab og åbnes med Enter eller mellemrum */
    .memo-body .memo-cite:focus-visible, .memo-facts .memo-cite:focus-visible { outline: 2px solid var(--c-primary); outline-offset: 1px; border-radius: 2px; background: rgba(29,78,216,0.08); }
    .memo-facts .memo-cite { border-bottom: 1.5px dotted var(--c-primary); cursor: pointer; }
    /* Henvisning til et dokument, der ikke står under Dokumenter i sagen */
    .memo-doc .memo-cite[data-nodoc] { border-bottom: 1.5px dashed #b91c1c; background: rgba(239,68,68,0.06); }
    .memo-doc .memo-cite[data-check] { border-bottom: 1.5px dashed #b91c1c; }
    .memo-doc .memo-cite[data-check]:not([data-nodoc])::after { content: '?'; display: inline-grid; place-items: center; width: 12px; height: 12px; margin-left: 3px; border-radius: 50%; background: #b91c1c; color: #fff; font-size: 9px; font-weight: 700; vertical-align: 1px; }
    .memo-doc .memo-cite[data-check=contra]:not([data-nodoc])::after { content: '!'; }
    .memo-doc .memo-cite[data-nodoc]::after { content: '!'; display: inline-grid; place-items: center; width: 12px; height: 12px; margin-left: 3px; border-radius: 50%; background: #b91c1c; color: #fff; font-size: 9px; font-weight: 700; vertical-align: 1px; }

    /* Tabeller: tal og kolonneoverskrifter brydes ikke midt i ord. Resten af
       teksten må gerne bryde, men kun mellem ord. */
    .memo-doc .memo-body table, .memo-doc .memo-body td, .memo-doc .memo-body th { overflow-wrap: normal; word-break: normal; hyphens: manual; -webkit-hyphens: manual; }
    .memo-doc .memo-body td[style*="text-align:right"], .memo-doc .memo-body th[style*="text-align:right"],
    .memo-doc .memo-body td[style*="text-align: right"], .memo-doc .memo-body th[style*="text-align: right"],
    .memo-doc .memo-body td[style*="monospace"] { white-space: nowrap; }
    .memo-doc .memo-body th { overflow-wrap: normal; }

    /* Værktøjslinjen: ét tabulatorstop, piletaster flytter mellem knapperne */
    .memo-tb:focus-visible { outline: 2px solid var(--c-primary); outline-offset: 1px; }

    /* Kommentarer: løste og trukne tilbage foldes sammen */
    .memo-cmt.resolved, .memo-cmt.withdrawn { background: var(--c-surface-2); box-shadow: none; }
    /* Blokering: kun den røde streg til venstre og ordene i rødt. Rød betyder,
       at noget blokerer, og bruges ikke andre steder i skinnen. */
    .memo-cmt.blocking { box-shadow: inset 3px 0 0 var(--c-danger); padding-left: 12px; }
    .memo-cmt-flag { display: block; width: 100%; font-size: 12px; color: var(--c-danger); }
    .memo-cmt-wait { display: block; width: 100%; font-size: 12px; color: var(--c-text-3); }
    .memo-target { outline: 2px solid var(--c-primary); outline-offset: 2px; }
    .memo-diff del { color: var(--c-danger); background: var(--c-danger-bg); text-decoration: line-through; }
    .memo-diff ins { color: var(--c-success); background: var(--c-success-bg); text-decoration: underline; }
    .memo-cmt-actions { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
    .memo-cmt-act { background: transparent; border: 0; padding: 0; cursor: pointer; color: var(--c-text-3); font-size: 11px; font-family: inherit; font-weight: 500; }
    .memo-cmt-act:hover { color: var(--c-ink); text-decoration: underline; }
    .memo-cmt-act.primary { color: var(--c-primary); }
    .memo-cmt-sum { display: flex; align-items: baseline; gap: 6px; width: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; font-family: inherit; text-align: left; font-size: 11.5px; color: var(--c-text-2); line-height: 1.45; }
    .memo-cmt-sum:hover .memo-cmt-sum-t { text-decoration: underline; }
    .memo-cmt-reason { font-size: 11.5px; color: var(--c-text-2); margin-top: 4px; padding-top: 5px; border-top: 1px dashed var(--c-line); line-height: 1.5; }
    .memo-cmt-as { font-size: 10.5px; color: var(--c-text-3); }

    /* Smal skærm: kommentarpanelet bliver en knap i kanten og en skuffe */
    .memo-rail-tab { width: 40px; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 0; border: 1px solid var(--c-line); border-radius: 10px; background: var(--c-surface); cursor: pointer; font-family: inherit; color: var(--c-text-2); }
    .memo-rail-tab:hover { border-color: var(--c-line-strong); color: var(--c-ink); }
    .memo-rail-tab span.v { writing-mode: vertical-rl; font-size: 12px; font-weight: 500; letter-spacing: 0.01em; }
    .memo-rail-tab .n { font-size: 12px; color: var(--c-text-3); line-height: 15px; font-variant-numeric: tabular-nums; }
    .memo-rail-tab .n.block { color: var(--c-danger); font-weight: 600; }
    .memo-drawer { position: fixed; right: 0; bottom: 0; width: min(340px, 92vw); z-index: 60; background: var(--c-bg, #fff); border-left: 1px solid var(--c-line); box-shadow: -12px 0 32px rgba(15,17,20,0.14); padding: 12px 12px 16px; display: flex; flex-direction: column; gap: 8px; }

    /* Indstillingsboksen på side 1 */
    .memo-facts { width: 100%; margin-top: 6px; font-size: 12px; border-collapse: collapse; border: 1px solid var(--c-line); }
    .memo-facts th { width: 170px; text-align: left; vertical-align: top; padding: 8px 12px; font-weight: 400; font-size: 11px; color: var(--c-text-3); border-bottom: 1px solid var(--c-line-2); border-right: 1px solid var(--c-line); background: var(--c-surface-2); }
    .memo-facts td { padding: 8px 12px; vertical-align: top; color: var(--c-ink); border-bottom: 1px solid var(--c-line-2); line-height: 1.55; }
    .memo-facts tr:last-child th, .memo-facts tr:last-child td { border-bottom: 0; }
    .memo-facts ul { margin: 0; padding-left: 16px; }
    .memo-facts li { line-height: 1.55; }
    .memo-facts .nw { white-space: nowrap; }
    .memo-facts .muted { color: var(--c-text-4); font-style: italic; }
    .memo-facts .src { font-size: 12px; color: var(--c-text-3); }
    /* Status på en betingelse er grå tekst: "· opfyldt". Åbne står uden mærke. */
    .memo-facts .st { color: var(--c-text-3); white-space: nowrap; }
  `;
  document.head.appendChild(s);
})();

/* ── Departments / personas ──────────────────────────────────────────────── */
// Afdelingen står som grå tekst efter navnet; der er ingen farve pr. afdeling
const MEMO_DEPTS = [
  { id: 'kredit',     label: 'Kredit',     author: 'Mette Larsen' },
  { id: 'compliance', label: 'Compliance', author: 'Jonas Holm' },
  { id: 'erhverv',    label: 'Erhverv',    author: 'Sofie Andersen' },
  { id: 'risiko',     label: 'Risiko',     author: 'Anders Bach' },
];
const MEMO_DEPT_MAP = MEMO_DEPTS.reduce((m, d) => (m[d.id] = d, m), {});

/* ── Comment storage + seed ──────────────────────────────────────────────── */
function _cmtKey(sKey) { return 'memo4-comments:' + sKey; }

function loadComments(sKey) {
  try {
    const raw = localStorage.getItem(_cmtKey(sKey));
    const list = raw ? JSON.parse(raw) : [];
    // Tåler gamle eller ødelagte data: kun rigtige kommentarer kommer igennem
    return Array.isArray(list) ? list.filter(c => c && typeof c === 'object' && c.id != null) : [];
  } catch (e) { return []; }
}

function saveComments(sKey, arr) {
  try { localStorage.setItem(_cmtKey(sKey), JSON.stringify(arr)); } catch (e) {}
}

/* ── Kommentarer: et spor, der ikke kan slettes ──────────────────────────────
   En kommentar slettes aldrig. Den løses (hvem, hvornår, hvorfor) eller
   trækkes tilbage af den, der skrev den. Begge dele står tilbage i sporet,
   foldet sammen. Rådgiveren skriver altid i eget navn.
   Comment = { id, dept, author, at (ISO), text, blocking?,
               resolved?: { by, at, reason }, withdrawn?: { by, at } }
   ──────────────────────────────────────────────────────────────────────────── */
const MEMO_ME = MEMO_DEPTS[0]; // Mette Larsen · Kredit, den der sidder ved tasterne

/* Kontrolfunktionerne kan blokere en indstilling. En kommentar fra Compliance
   eller Risiko, der kræver handling, blokerer, indtil den er løst med en
   begrundelse. */
const MEMO_BLOCKING_DEPTS = ['compliance', 'risiko'];
const MEMO_BLOCKING_RE = /kan ikke (godkendes|bevilges|indstilles)|skal være på plads|skal foreligge|cannot be approved|must be in place/i;
function isBlockingComment(c) {
  if (!c) return false;
  if (typeof c.blocking === 'boolean') return c.blocking;
  return MEMO_BLOCKING_DEPTS.includes(c.dept) && MEMO_BLOCKING_RE.test(c.text || '');
}
function commentState(c) { return !c ? 'open' : c.withdrawn ? 'withdrawn' : c.resolved ? 'resolved' : 'open'; }
function commentWhen(c) { return c.at ? (window.CW ? CW.fmtWhen(c.at) : c.at) : (c.date || ''); }

/* Tidspunkterne regnes fra nu, så sporet aldrig ligger før dokumenterne eller efter i dag */
function _seedAt(daysAgo, hh, mm) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}
function memoCommentSeed() {
  return {
    conclusion: [
      { id: 1, dept: 'risiko', author: 'Anders Bach', at: _seedAt(3, 8, 45),
        text: 'Kundekoncentration bør fremhæves tydeligere her. 64 % på top-3 er højt og vil være det første, komitéen kigger på.' },
      { id: 2, dept: 'kredit', author: 'Mette Larsen', at: _seedAt(3, 9, 2),
        text: 'God pointe. Jeg har fremhævet det som punkt 1 under "på trods af". Tak.' },
    ],
    financial: [
      { id: 1, dept: 'erhverv', author: 'Sofie Andersen', at: _seedAt(4, 14, 32),
        text: 'Budgettet henviser til et ark Følsomhed, som ikke er med i den indsendte fil. Har kunden sendt det?' },
      { id: 2, dept: 'kredit', author: 'Mette Larsen', at: _seedAt(4, 15, 8),
        text: 'Endnu ikke. Jeg har sendt en mail til Anders i går og følger op i morgen.' },
      { id: 3, dept: 'compliance', author: 'Jonas Holm', at: _seedAt(3, 9, 11),
        text: 'OK. Sæt det som åbent punkt i sagsmappen, indtil vi har arket.' },
    ],
    appendix1: [
      { id: 1, dept: 'compliance', author: 'Jonas Holm', at: _seedAt(3, 10, 20), blocking: true,
        text: 'Tilbagetrædelseserklæringen fra Anders Christensen på anpartshaverlånet skal være på plads inden bevilling. Kan ikke godkendes uden.' },
    ],
  };
}

(function seedMemoComments() {
  if (typeof localStorage === 'undefined') return;
  try {
    // "Skriver som" findes ikke længere
    localStorage.removeItem('memo4-persona');
    if (localStorage.getItem('memo4-comments-seeded') === 'v4') return;
    // Rester fra tidligere versioner: alle kommentarnøgler ryddes, så der ikke
    // står gamle tråde under afsnit, der ikke findes længere
    Object.keys(localStorage).forEach(k => { if (k.indexOf('memo4-comments:') === 0) localStorage.removeItem(k); });
    Object.entries(memoCommentSeed()).forEach(([k, arr]) => saveComments(k, arr));
    // v4: kommentarer løses i stedet for at slettes, med tidspunkt som ISO
    localStorage.setItem('memo4-comments-seeded', 'v4');
  } catch (e) {}
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

/* ── Language mode ────────────────────────────────────────────────────────────
   Switching language reloads the page, so a module-level branch is safe. When
   the app runs in English the seeded template content below is swapped for the
   English variant (SEC_EN), and localStorage keys are namespaced per language
   so English mode seeds fresh English content without touching Danish work. */
const MEMO_EN = (typeof window !== 'undefined' && window.CW_LANG === 'en');
const LANG_SUFFIX = MEMO_EN ? ':en' : '';

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
      <p><strong>Aktiviteter:</strong> Nordhavn Composite A/S udvikler og fremstiller fiberforstærkede kompositkomponenter til vindindustrien, primært strukturelle vingekomponenter som kulfiberbjælker (spar caps), rodmoduler og næsekanter samt service og reservedele. Selskabet er underleverandør til vindmølleproducenterne (OEM) efter en build-to-print- og co-engineering-model og producerer i Frederikshavn og Sæby (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">ledelsesberetningen</span>). De største kunder er GE Vernova, Vestas og Siemens Gamesa.</p>
      <p><strong>Historik (seneste 5 år):</strong></p>
      <ul>
        <li>2021-2025: Nettoomsætningen er vokset fra DKK 19,4 mio. til <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">DKK 41,1 mio.</span>, og EBITDA fra DKK 0,6 mio. til 2,4 mio.</li>
        <li>2022: Industrifonden A/S indtræder som kapitalejer (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 1">ejerbogen</span>).</li>
        <li>2024: ISO 9001-certificering, rodmodulprogrammet for Vestas sættes i drift i andet halvår, og en rettet kapitalforhøjelse på DKK 0,6 mio. tegnes af Industrifonden A/S, Anders Holding ApS og Erhvervsfonden (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">årsrapport 2024, note 11</span>).</li>
        <li>2025: Omsætningsvækst på 25,3 %, investering i en CNC-fræsecelle og kapitalforhøjelse på DKK 0,4 mio. tegnet pro rata af alle kapitalejere.</li>
        <li>9. december 2025: <span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">Rammeaftale GEV-BI-2025-0447 med GE Vernova</span> om 62 vingesæt til Block Island Wind Farm Phase II, kontraktværdi USD 4,15 mio. (ca. DKK 28,4 mio.), leveret i 2026 og 2027.</li>
        <li>2026: DL-1 leveret 27. maj og DL-2, kontraktens kritiske milepæl, leveret 22. september, tre dage før fristen (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">bankens tillæg af 23. september 2026</span>).</li>
      </ul>
      <p><strong>Pengeinstituttets motiv:</strong> Nordjyske Bank har været selskabets eneste pengeinstitut siden 2017 og vurderer engagementet som godt, men Block Island-ordren koncentrerer risikoen: tilbagebetalingen afhænger af én kundes betaling i 4. kvartal 2026, betalingen sker i USD, kulfiberprisen er steget 22 %, og EBITDA-marginen er tynd. Uden EIFO ville bankens bruttoengagement på DKK 8,5 mio. overskride bankens interne grænse på DKK 6,0 mio. i nettoeksponering; med kautionen er nettorisikoen DKK 4,9 mio. (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 2">ansøgningen, afsnit 2</span>).</p>
    </div>

    <h3 class="tpl-subhead">Låneformål</h3>
    <ul class="tpl-hints">
      <li>Årsag til låneansøgning</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Nordjyske Bank ansøger på vegne af Nordhavn Composite A/S om <strong><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">EIFO-eksportkaution på DKK 3,6 mio.</span></strong>, svarende til 80 % af en ny revolverende eksportfacilitet på DKK 4,5 mio. Faciliteten skal sammen med en udvidelse af driftskreditten fra DKK 1,5 mio. til 2,2 mio. og egne midler finansiere et samlet kapitalbehov på <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">DKK 7,0 mio.</span> til Block Island-ordren: materialeindkøb af kulfiber og harpiks DKK 2,8 mio., igangværende arbejder DKK 2,4 mio. og arbejdskapital frem til GE Vernovas betaling i 4. kvartal 2026 DKK 1,8 mio. Den ansøgte nye eksterne finansiering udgør DKK 5,2 mio. (eksportfaciliteten på 4,5 mio. plus udvidelsen af driftskreditten med 0,7 mio.).</p>
      <p>Bankens første bevilling bortfaldt 30. juni 2026, fordi EIFOs tilsagn ikke forelå. Banken har 10. september 2026 fornyet bevillingen på uændrede beløb med etablering 1. november 2026, betinget af EIFOs kautionstilsagn senest 31. oktober 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">ansøgningens tillæg nr. 1</span>).</p>
    </div>
  `,

  /* ─── 2) Finansieringsstruktur ─────────────────────────────────────────── */
  financing: `
    <table>
      <thead><tr><th>Finansieringsplan</th><th style="text-align:right">DKK mio.</th><th style="text-align:right">%</th><th>Kapitalbehov</th><th style="text-align:right">DKK mio.</th></tr></thead>
      <tbody>
        <tr><td>Eksportfacilitet, Nordjyske Bank (heraf EIFO-kaution 80 % = 3,6)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">4,5</span></td><td style="text-align:right;font-family:monospace">64,3 %</td><td>Materialeindkøb (kulfiber/harpiks)</td><td style="text-align:right;font-family:monospace">2,8</td></tr>
        <tr><td>Nordjyske Bank, driftskredit (1,5 eksisterende + 0,7 ny)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">2,2</span></td><td style="text-align:right;font-family:monospace">31,4 %</td><td>Igangværende arbejder</td><td style="text-align:right;font-family:monospace">2,4</td></tr>
        <tr><td>Egenfinansiering, frie likvide midler</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">0,3</span></td><td style="text-align:right;font-family:monospace">4,3 %</td><td>Arbejdskapital frem til Q4-betaling</td><td style="text-align:right;font-family:monospace">1,8</td></tr>
        <tr><td><span class="tpl-blank">[tilføj række]</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">0,0</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">%</span></td><td><span class="tpl-blank">[kapitalbehov]</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">0,0</span></td></tr>
        <tr><td><strong>Total</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">7,0</td><td style="text-align:right;font-family:monospace;font-weight:600">100,0 %</td><td><strong>Total</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">7,0</td></tr>
      </tbody>
    </table>
    <ul class="tpl-hints">
      <li>Vurdering af om risikodelingen er tilstrækkeligt balanceret, under hensyn til EIFOs andel af finansieringen, om EIFO kautionerer for eller bidrager med egenkapital til medfinansieringen, sikkerheder, afviklingsprofil og om EIFO er efterstillet øvrig gæld.</li>
      <li>Bemærkninger til afviklingsprofil, herunder argumenter for indledende afdragsfrihed.</li>
      <li>Evt. øvrige bemærkninger til finansieringsstrukturen.</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p><strong>Risikodeling:</strong> EIFO-kautionen dækker 80 % (DKK 3,6 mio.) af eksportfaciliteten på DKK 4,5 mio. med proportional dækning (pari passu), ikke first loss. Banken bærer selv 20 % (DKK 0,9 mio.) af faciliteten, hele driftskreditten på DKK 2,2 mio. og det eksisterende anlægslån på DKK 1,8 mio. EIFO er sidestillet med banken i det stillede pant og er ikke efterstillet (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">ansøgningen, afsnit 1.1</span>). Bankens bruttoengagement bliver DKK 8,5 mio. med en nettorisiko på DKK 4,9 mio.</p>
      <p><strong>Afviklingsprofil:</strong> Faciliteten er revolverende med træk mod dokumenterede materialefakturaer og igangværende arbejder. Efter bankens fornyede tilsagn løber kautionsperioden fra 1. november 2026 til 30. april 2029 (30 mdr.), og det maksimale træk nedtrappes fra DKK 3,0 mio. i 1. kvartal 2027 til DKK 2,0 mio. pr. 30. juni 2027 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">ansøgningens tillæg, pkt. 2</span>). Der er ingen indledende afdragsfrihed: faciliteten indfries løbende af GE Vernovas T2-betalinger for delleverancerne, og i budgettet er trækket DKK 0,5 mio. ultimo 2026, 0,6 mio. ultimo 2027 og 0,7 mio. ultimo 2028 (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">budgettets note 7</span>). Faciliteten skal især bære en forsinket betaling fra GE Vernova, jf. følsomhedsanalysen i afsnit 10.</p>
      <p><strong>Øvrige bemærkninger:</strong> Ansøgningens egen finansieringsplan (afsnit 1.3) fordeler behovet som 3,6 / 2,2 / 1,2 mio. og udelader bankens uafdækkede andel af faciliteten på 0,9 mio.; tabellen ovenfor følger budgettets plan, der afstemmer til kapitalbehovet. Banken bedes bekræfte fordelingen, jf. Uoverensstemmelser i kildematerialet i afsnit 5. <span class="tpl-blank">[evt. supplerende bemærkninger]</span></p>
    </div>
  `,

  /* ─── 3) Rating ─────────────────────────────────────────────────────────── */
  rating: `
    <table>
      <tbody>
        <tr><td style="width:42%">Objektiv (beregnet) Credit rating</td><td><strong>BB+</strong> <span style="color:var(--c-text-3); font-size:11px">(score 6,2/10)</span> (<span class="memo-cite" data-doc="Ratingberegning_2026-0184.pdf" data-page="s. 1">ratingberegningen, s. 1</span>)</td></tr>
        <tr><td>Indstillet Credit rating</td><td><strong>BB</strong> <span style="color:var(--c-text-3); font-size:11px">(override − 1 trin)</span> (<span class="memo-cite" data-doc="Ratingberegning_2026-0184.pdf" data-page="s. 2">ratingberegningen, s. 2</span>)</td></tr>
        <tr><td>Anvendt (-e) overrides</td><td>Kundekoncentration: nedjustering 1 trin</td></tr>
        <tr><td>Argumentation for overrides</td><td>Top-3 kunder udgør <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Kunder">64 % af omsætningen</span> i de første otte måneder af 2026, med GE Vernova alene på 38 %. Den objektive model fanger ikke risikoen ved tab af én primær kunde tilstrækkeligt, hvorfor manuel nedjustering ét trin er anvendt. Til sammenligning placerer Nordjyske Bank selskabet i ratingklasse 5 af 11 med en etårig PD på 1,4 % (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">ansøgningen, afsnit 3.6</span>).</td></tr>
      </tbody>
    </table>
  `,

  /* ─── 4) Juridiske forhold ─────────────────────────────────────────────── */
  legal: `
    <ul class="tpl-hints">
      <li>[Anvendes kun ved udlån]</li>
      <li>[Indsæt Legal SME's / International Regulation &amp; Relations' vurdering]</li>
    </ul>
    <p><strong>Legal SME's vurdering:</strong> <span class="tpl-blank">[indsæt vurderingen, eller begrund hvorfor Legal SME ikke er inddraget]</span></p>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Følgende forhold i sagens dokumenter bør indgå i Legal SME's vurdering:</p>
      <ul>
        <li><strong>Rammeaftalen med GE Vernova</strong> er underlagt dansk ret med voldgift i København (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§14">§14</span>). Den indeholder cross-default ved misligholdelse af finansiering over DKK 1,0 mio., ved opsigelse eller manglende forlængelse af en kreditfacilitet og ved brud på nøgletalskrav (soliditet min. 30 %, gæld/EBITDA maks. 4,0), samt en ejerskifteklausul, hvis Anders Holding ApS' ejerandel falder under 33,4 % (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§11">§11.6 og §11.7</span>).</li>
        <li>Fordringer under aftalen kan ikke pantsættes uden GE Vernovas skriftlige samtykke, og GE Vernova har ejendomsret til materialer og igangværende arbejder, der er finansieret af forudbetalingen (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§4">§4.7 og §4.10</span>). Banken afgav sin erklæring herom 21. september 2026, før fristen 30. september, og aktiverne indgår ikke i trækgrundlaget (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">tillægget, pkt. 7</span>). Det berører debitorpantet og trækgrundlaget for faciliteten.</li>
        <li>Anders Christensens anpartshaverlån på DKK 0,5 mio. er ikke efterstillet, og der foreligger ingen tilbagetrædelseserklæring (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">note 14</span>). Erklæringen er betingelse for første udbetaling.</li>
        <li>Selskabet ydede i 2025 et ulovligt kapitalejerlån til direktøren i strid med selskabslovens § 210 (maks. t.DKK 180, indfriet med renter 12. november 2025). Revisor har omtalt forholdet i påtegningen, og ledelsen kan ifalde ansvar (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 14">revisionspåtegningen</span>). Ejerbogen beskriver fejlagtigt anpartshaverlånet som et § 210-lån, jf. Uoverensstemmelser i kildematerialet i afsnit 5.</li>
        <li>Selskabskautionen fra Nordhavn Holding ApS foreligger kun som udkast uden underskrift og uden selskabsretlig beslutning (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S5">S5</span>).</li>
      </ul>
    </div>
  `,

  /* ─── 5) Risikovurdering ────────────────────────────────────────────────── */
  risk: `
    <table>
      <thead><tr><th style="width:38%">Væsentligste risikoområder</th><th>Mitigering</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>Risikoområde 1: Kundekoncentration</strong><br/><span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Kunder">Top-3 kunder = 64 % af omsætningen</span> i de første otte måneder af 2026, GE Vernova alene 38 %. GE Vernova udgør <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Ordrebog">45,3 % af ordrebogen</span> for de næste fire kvartaler.</td>
          <td><em>Uddyb risikoområdet / Analyser mitigerende forhold:</em><br/>Faciliteten tilbagebetales reelt af én kundes betalinger. GE Vernova har garanteret aftag af de 62 vingesæt (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">rammeaftalen, pkt. 1.6</span>), og forudbetalingen på USD 1,245 mio. er modtaget. Selskabet er kvalificeret hos to nye kunder med første leverance i 2026 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>).<br/><strong>Dette mitigeres ved</strong> override i rating (-1 trin) samt kvartalsvis ordrebogsrapport og debitorliste (rapporteringskrav R4 og R5).<br/><em>Vurdering: Ikke fuldt mitigeret, fastholdes som override.</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 2: Råvarepriser</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">Kulfiber +22 % år til år; fastprisaftaler dækker ca. 60 %</span> af det forventede forbrug for de kommende 12 måneder.</td>
          <td>De resterende ca. 40 % købes til spotpris (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Forudsætninger">budgettets forudsætninger</span>). GE Vernova-aftalen regulerer kun kulfiberprisen ud over et dødbånd på ±10 procentpoint, og den overskydende stigning på den usikrede andel deles 50/50 (75/25 over 15 procentpoint) (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§7">§7.4</span>); første regulering pr. 1. juli 2026 gav USD 28.416. En yderligere stigning på 10 % på den usikrede andel koster ca. t.DKK 380 i bruttofortjeneste (note 18). Årsrapporten angiver indeksklausuler i tre af de fire største kundekontrakter, mens periodetallenes noter oplyser, at Vestas og Siemens Gamesa ikke har en tilsvarende klausul; det skal afklares.<br/><em>Vurdering: Delvist mitigeret.</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 3: Valutaeksponering</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">41 % af omsætningen faktureres i USD/EUR</span>, og der er ingen formel hedgingpolitik.</td>
          <td>Block Island-kontrakten afregnes i USD, og køber bærer ingen valutarisiko. Der er ikke indgået terminsforretninger pr. 31. august 2026 (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Noter">periodetallenes note 5</span>). Et fald på 10 % i USD reducerer provenuet af 2026-delen med ca. DKK 0,92 mio., svarende til ca. 80 % af årets bundlinje (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 2">ansøgningen, afsnit 2.2</span>). Efter bankens tillæg skal mindst 70 % af den resterende kontraktsum sikres senest 1. december 2026, og bestyrelsen skal vedtage en valutapolitik senest 30. november 2026 (covenant C6); bestyrelsen behandler politikken 19. november 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">tillægget, pkt. 3</span>).<br/><em>Vurdering: Ikke mitigeret, før terminssikringen er dokumenteret (betingelse B4).</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 4: Leverance og likviditet</strong><br/><span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§3">Delleverance DL-2 med sidste rettidige leveringsdag fredag den 25. september 2026</span> var kontraktens kritiske milepæl (M3) og blev leveret 22. september 2026. Likviditeten bunder i DKK 0,93 mio. ultimo oktober 2026 med driftskreditten fuldt udnyttet.</td>
          <td>Forsinkelse koster bod på 0,5 % pr. påbegyndt uge (maks. 5 %), og forsinkelse af M3 med mere end 10 uger giver køber ret til at hæve aftalen. Produktionsudstyret er proceslåst og kan ikke flyttes uden købers godkendelse. DL-1 blev leveret rettidigt 27. maj 2026, og DL-2 blev leveret DAP Cherbourg 22. september 2026; modtagekontrollen afsluttes senest 6. oktober 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">tillægget, pkt. 6</span>). Indkøringen af den nye form F-7 i 1. kvartal 2026 betød, at linje L-2 stod stille i sammenlagt elleve arbejdsdage (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Noter">periodetallenes note 2</span>). Likviditeten er stram, indtil faciliteten etableres 1. november: driftskreditten er fuldt udnyttet ultimo oktober, og der er ingen uudnyttet ramme (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">likviditetsprognosen</span>). Forsinkes GE Vernovas betaling for DL-2 (forfald 24. november 2026) til januar 2027, ender december 2026 på DKK -1,37 mio. før træk på faciliteten; med faciliteten kan forsinkelsen bæres.<br/><em>Vurdering: Delvist mitigeret. Leverancerisikoen på DL-2 er bortfaldet; likviditeten forudsætter, at faciliteten etableres 1. november 2026.</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 5: Governance og anpartshaverlån</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 14">Revisor har afgivet supplerende oplysning om et ulovligt kapitalejerlån til direktøren (selskabslovens § 210) og fremhævet, at anpartshaverlånet på t.DKK 500 ikke er efterstillet</span>.</td>
          <td>Kapitalejerlånet (maks. t.DKK 180) er indfriet med lovpligtige renter 12. november 2025, og der er fra 1. december 2025 indført en skriftlig forretningsgang for udlæg og mellemregninger med ledelsen (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">note 14</span>). Ledelsen kan ifalde ansvar. Anpartshaverlånet fra Anders Christensen personligt har samme stilling som simple kreditorer, indtil tilbagetrædelseserklæring foreligger (betingelse B2), og covenant C4 forbyder betalinger på lånet i kautionsperioden.<br/><em>Vurdering: Væsentlig risiko. Mitigeret, hvis B2 er opfyldt før første udbetaling, og bestyrelsen følger op på forretningsgangen.</em></td>
        </tr>
        <tr>
          <td><strong>Risikoområde 6: Sikkerhedernes værdi</strong><br/>Maskinpantet har en <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S1">realisationsværdi ved hurtig afvikling DKK 2.100.000</span>, virksomhedspantet omfatter kun debitorer, og ejendommens reelle belåning er uafklaret.</td>
          <td>Bankens prioritetsoversigt medtager ikke realkreditlånet med pant i Havnegade 42 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">note 10</span>). Med lånet forrest er den samlede behæftelse ca. DKK 6,0 mio., ca. 147 % af den offentlige vurdering på DKK 4,1 mio., og ejerpantebrevet på DKK 2,5 mio. har reelt ingen dækning. Materialer og igangværende arbejder finansieret af GE Vernovas forudbetaling tilhører køberen og indgår ikke i trækgrundlaget (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§4">§4.7</span>). Selskabskautionen er et uunderskrevet udkast (B1).<br/><em>Vurdering: Delvist mitigeret. Tingbogsattest og underskrevet selskabskaution skal foreligge før første udbetaling.</em></td>
        </tr>
      </tbody>
    </table>
    <p class="tpl-note">Tilføj eller slet rækker efter behov.</p>

    <h3 class="tpl-subhead">Uoverensstemmelser i kildematerialet</h3>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Kildedokumenterne er holdt op mod hinanden. Følgende forhold er ikke ens i kilderne og er håndteret således i memoet:</p>
      <table>
        <thead><tr><th style="width:34%">Forhold</th><th>Håndtering</th></tr></thead>
        <tbody>
          <tr><td><strong>Anpartshaverlånet og § 210.</strong> <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">Ejerbogen</span> kalder lånet på 0,5 mio. fra Anders Christensen et ulovligt kapitalejerlån efter § 210 med 12 måneders opsigelsesvarsel.</td><td>Efter <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">note 14</span> og revisors påtegning er det et lån til selskabet med 6 måneders varsel, tidligst fra 30. juni 2027. § 210-forholdet var et separat mellemværende på maks. t.DKK 180, indfriet 12. november 2025. Memoet følger note 14; ejerbogsføreren bedes rette udskriften. <em>Åben.</em></td></tr>
          <tr><td><strong>Realkreditlånet i Havnegade 42.</strong> <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">Note 10</span> og periodetallene har et realkreditlån med pant i ejendommen (restgæld ca. 1,9 mio.), som prioritetsoversigten i S2 ikke medtager (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S2">samlet pantebehæftelse DKK 4.100.000</span>).</td><td>Tingbogsattest indhentes før udbetaling. Indtil da regnes ejerpantebrevet på 2,5 mio. ikke med som reel dækning (behæftelse ca. 147 % af vurderingen). <em>Åben.</em></td></tr>
          <tr><td><strong>Likviditetens lavpunkt.</strong> Bankansøgningen bygger på budget version 2.2 (maj) med lavpunkt 0,62 mio. i november og 1,92 mio. disponibelt.</td><td>Memoet bruger budget version 3, der er afstemt til periodetallene pr. 31. august: lavpunkt 0,93 mio. ultimo oktober med fuldt udnyttet driftskredit og 0,93 mio. disponibelt (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">bemærkning 1</span>). <em>Afstemt.</em></td></tr>
          <tr><td><strong>Egenkapitalen 2024.</strong> Egenkapitalen steg fra 3,5 til 4,8 mio., mens årets resultat var 0,7 mio.</td><td>Forskellen er en rettet kontant kapitalforhøjelse på 0,6 mio. 27. juni 2024 (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">note 11</span>): 3,5 + 0,7 + 0,6 = 4,8. <em>Afstemt.</em></td></tr>
          <tr><td><strong>Periodisering af Block Island.</strong> <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">Budgettet</span> har 5,6 mio. i 3. kvartal og 6,2 mio. i 4. kvartal 2026, mens leveringsplanen har DL-1, DL-2 og DL-3 i 2026 til USD <span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§3">780.400, 1.036.800 og 648.000</span>, beregnet til ca. DKK 16,9 mio. ved kurs 6,85.</td><td>Selskabet bedes afstemme budgettet med leveringsplanen. Memoet vurderer 2026 på realiserede tal og ordrebog; 2027 hviler i højere grad på optionen på 18 vingesæt og nye ordrer. <em>Åben.</em></td></tr>
          <tr><td><strong>Finansieringsplanen.</strong> <span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">Ansøgningen</span> fordeler behovet som 3,6 / 2,2 / 1,2 mio.; <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">budgettet</span> som 4,5 / 2,2 / 0,3 mio.</td><td>Memoet følger budgettets plan, der afstemmer til kapitalbehovet på 7,0 mio. og medtager bankens uafdækkede andel. Banken bedes bekræfte. <em>Åben.</em></td></tr>
          <tr><td><strong>Indeksklausuler.</strong> <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">Note 18</span> nævner klausuler i tre af de fire største kundekontrakter; periodetallene siger, at Vestas og Siemens Gamesa ikke har en.</td><td>Afklares med selskabet. Kun GE Vernova-aftalens regulering regnes som mitigering i risikoområde 2. <em>Åben.</em></td></tr>
        </tbody>
      </table>
    </div>
  `,

  /* ─── 6) Konklusion og indstilling ─────────────────────────────────────── */
  conclusion: `
    <p><strong>Konklusion, samlet risikovurdering: <span class="tpl-risk mid">Middel/Høj</span></strong></p>

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
        <li><strong>Økonomisk levedygtighed:</strong> Nettoomsætningen er steget til <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41,1 mio. i 2025</span>, men indtjeningsevnen er tynd: EBITDA-marginen er <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8 %</span> og uændret fra 2024. Gæld/EBITDA på <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3,3×</span> er højt for en virksomhed af denne størrelse; budgettet for 2026 forventer 3,0. Gældsserviceringsevnen er tilstrækkelig i basisscenariet, men følsom over for betalingstidspunktet fra GE Vernova og USD-kursen (afsnit 10).</li>
        <li><strong>EIFO-strategi:</strong> I overensstemmelse med EIFOs eksportfokus og strategi for grøn omstilling: faciliteten finansierer eksport af komponenter til et amerikansk havvindprojekt.</li>
        <li><strong>Ledelseskompetencer:</strong> Medstifterne Anders Christensen (CEO) og Maria Lindbjerg (CTO) har ledet selskabet siden 2014 gennem mere end en fordobling af omsætningen. Bestyrelsen har en uafhængig formand, der har arbejdet i vindmølleindustrien gennem 22 år, og to investorudpegede medlemmer (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">ledelsesoversigten</span>). Revisor er Nordjysk Revision P/S (statsautoriseret). Ledelsens uddannelse og tidligere ansættelser er ikke dokumenteret i materialet.</li>
        <li><strong>Særvilkår:</strong> Tilbagetrædelseserklæring fra Anders Christensen på anpartshaverlånet, underskrevet selskabskaution fra Nordhavn Holding ApS, valutasikring af mindst 70 % af den resterende kontraktsum og skriftlig valutapolitik samt kvartalsvis covenant- og ordrebogsrapportering (se Bilag 1).</li>
        <li><strong>ESG:</strong> Lav risiko, jf. Bilag 2. Selskabet leverer komponenter til vedvarende energi.</li>
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
        <li>Høj kundekoncentration (top-3 = 64 %, GE Vernova 38 %), som ikke fuldt kan mitigeres; håndteret via rating-override og rapporteringskrav.</li>
        <li>Revisors supplerende oplysning om ulovligt kapitalejerlån til direktøren (selskabslovens § 210) og fremhævelse af det ikke-efterstillede <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">anpartshaverlån på DKK 0,5 mio.</span> fra Anders Christensen. Tilbagetrædelseserklæring er betingelse for første udbetaling.</li>
        <li>Uafdækket USD-eksponering: der er ingen terminsforretninger, og et kursfald på 10 % svarer til ca. 80 % af årets forventede resultat.</li>
        <li>Sikkerhederne er ikke på plads: selskabskautionen er et uunderskrevet udkast, allonger om EIFOs sidestilling i pantet foreligger ikke, og bankens prioritetsoversigt for ejendommen medtager ikke realkreditlånet (Bilag 1).</li>
        <li>Stram likviditet frem til etableringen: likviditeten bunder i DKK 0,93 mio. ultimo oktober 2026 med fuldt udnyttet driftskredit, ca. 1,0 mio. mindre disponibelt end i bankansøgningens budget. Banken har fornyet sit tilsagn, betinget af EIFOs tilsagn senest 31. oktober 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">ansøgningens tillæg</span>).</li>
        <li>Uafklarede uoverensstemmelser i kildematerialet om ejendomspantet, ejerbogens beskrivelse af anpartshaverlånet og budgettets periodisering af Block Island (afsnit 5).</li>
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
      <p>Selskabet ejes af <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 1">Anders Holding ApS (50,7 %), Erhvervsfonden (23,6 %), Maria Lindbjerg (15,6 %) og Industrifonden A/S (10,1 %)</span>. Anders Holding ApS ejes 100 % af Anders Christensen, der er eneste registrerede reelle ejer. Der er udstedt medarbejderwarrants svarende til 5,0 % ved fuld udnyttelse, som kun fremgår af ejerbogen. Ejerkredsen er ikke fragmenteret, men de to institutionelle investorer har efter ejeraftalen vetoret over bl.a. ny gæld, pantsætning og transaktioner med nærtstående. Erhvervsfonden har 30. juni 2026 samtykket til ny finansiering op til DKK 7,5 mio. og tilhørende pant, men ikke til kaution (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 4">ejeraftalen</span>). Banken har ingen RKI-registreringer på selskabet, Anders Holding ApS, Nordhavn Holding ApS eller Anders Christensen (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">ansøgningen, afsnit 3.2</span>).</p>
      <p>Anders Christensen har personligt ydet selskabet et <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">anpartshaverlån på DKK 0,5 mio. (5,0 % p.a., afdragsfrit og uden fast indfrielsesdato; kan tidligst opsiges med virkning fra 30. juni 2027)</span>. Lånet er usikret og ikke efterstillet, og der foreligger ingen tilbagetrædelseserklæring. Anders Christensen har afgivet <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S4">personlig selvskyldnerkaution på maks. DKK 1,0 mio.</span>, underskrevet 15. januar 2026. Der foreligger ingen opdateret formueopgørelse, så kautionens reelle værdi er ikke verificeret.</p>
      <p>Selskabet har ingen datterselskaber. Anders Christensen kontrollerer desuden Nordhavn Holding ApS (ejet 66,7 % af Anders Holding ApS og 33,3 % af Maria Lindbjerg), der ejer søsterselskabet Nordhavn Production ApS (efterbearbejdning og pakning, 6 ansatte). Samhandlen er begrænset og sker på markedsvilkår (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">ejerbogen, koncernoversigt</span>). Anders Christensen er født 1979 (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">ledelsesoversigten</span>), og et generationsskifte er ikke aktuelt. Ejeraftalen binder ham og Maria Lindbjerg til fuldtidsbeskæftigelse i selskabet (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 4">ejeraftalen, punkt 11</span>). Ophører en af dem med at være aktivt tilknyttet den daglige ledelse, uden at en efterfølger er godkendt, kan køberen kræve rammeaftalen genforhandlet (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§11">§11.7</span>).</p>
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
        <li><strong>CEO/medstifter:</strong> Anders Christensen, adm. direktør siden stiftelsen i 2014, ansvarlig for kommerciel ledelse, kundeforholdene til GE Vernova, Vestas og Siemens Gamesa samt finansiering (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">ledelsesoversigten</span>). Han er uddannet civilingeniør i materialeteknologi fra Aalborg Universitet i 2004 og var ansat hos LM Wind Power 2004-2013, senest som produktionschef for vingekomponenter (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">ledelsesoversigten</span>).</li>
        <li><strong>CTO/medstifter:</strong> Maria Lindbjerg, CTO siden 2019, ansvarlig for procesudvikling, materialevalg og kvalitetsledelse. Hun er ikke anmeldt som direktør i CVR og har prokura op til DKK 0,5 mio. pr. disposition.</li>
        <li><strong>Økonomifunktion:</strong> Økonomichef Susanne Pedersen (tiltrådt 1. juni 2026) og controller Thomas Riis udarbejder budget, månedlig likviditetsprognose og periodetal. Budgettets tidligere versioner, herunder version 2.2 bag bankansøgningen, er udarbejdet af den tidligere økonomichef Pia Nørgaard (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Versionslog">budgettets versionslog</span>). Skiftet midt i finansieringssagen og de uoverensstemmelser, der er fundet i budgettet, taler for kvartalsvis opfølgning på rapporteringen.</li>
        <li><strong>Incitamentsløsninger:</strong> Warrantprogram NC-W2022 til 14 medarbejdere og nøglemedarbejdere (5,0 % ved fuld udnyttelse) samt bonus til direktionen på t.DKK 130 i 2025.</li>
        <li><strong>Risikoappetit:</strong> Ledelsen har påtaget sig selskabets hidtil største ordre uden valutasikring og har finansieret materialekøbet på driftskreditten, der er fuldt udnyttet ultimo oktober 2026. Vurderes som moderat risikovillig.</li>
        <li><strong>Referencer:</strong> Banken beskriver ledelsen som troværdig i sin rapportering og har ingen betalingsanmærkninger siden 2017 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">ansøgningen, afsnit 3</span>). Der er ikke oplyst konkurshistorik.</li>
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
      <p>Bestyrelsen består af fire medlemmer (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 2">selskabsoplysningerne</span>): Erik Sandberg (formand siden 2020, uafhængig, 22 år som produktionsdirektør og COO i vindindustrien), Anders Christensen (CEO og indirekte majoritetsejer), Lene Mortensen (udpeget af Erhvervsfonden, investeringsdirektør, cand.merc.aud.) og Kim Vestergaard (udpeget af Industrifonden A/S, partner, tidligere finansdirektør i to industrielle underleverandørkoncerner).</p>
      <p>Bestyrelsen vurderes professionelt sammensat med reel modvægt til direktionen. Der blev afholdt 6 ordinære møder og 1 ekstraordinært møde i 2025. Der er ikke nedsat revisionsudvalg, og den femte bestyrelsespost har været ubesat siden april 2025 (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">ledelsesoversigten</span>). <span class="tpl-blank">[evt. uddybning af bestyrelsesarbejdet]</span></p>
    </div>

    <h3 class="tpl-subhead">Rådgivere/netværk</h3>
    <p class="tpl-note">Anføres kun, hvis disse er væsentlige og der ikke er en professionel bestyrelse.</p>
    <em class="tpl-hint">Rådgivere/netværk, som er tæt på virksomheden samt kort beskrivelse ift. kompetencer samt reel værdi af sparring.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Revisor: <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 2">Nordjysk Revision P/S</span>, statsautoriseret revisor Henrik Bak, revisor siden regnskabsåret 2017. Advokat: Advokatfirmaet Hjulmand, Aalborg. Ejerbogen føres af Advokatfirmaet Vendia. Rådgivernes rolle i strategiske beslutninger er ikke belyst i materialet.</p>
    </div>

    <p><strong>Samlet konklusion på ejerstruktur, ledelse, bestyrelse og rådgivere, risikovurdering: <span class="tpl-risk mid">Middel</span></strong></p>
    <em class="tpl-hint">Kort konklusion på ledelseskraften herunder hvorvidt ejerne bruger bestyrelse og rådgivere aktivt samt en konklusion på, hvorvidt den er tilstrækkelig sammensat ift. at fremtidssikre virksomheden.</em>
    <p>Professionelt sammensat bestyrelse med uafhængig formand og investorudpegede medlemmer, og ledelsen har gennemført en kraftig vækst. Governance trækker ned: selskabet ydede i 2025 et ulovligt kapitalejerlån til direktøren, som revisor har omtalt i påtegningen, og anpartshaverlånet er ikke efterstillet. Kapitalejerlånet er indfriet, og der er indført en ny forretningsgang, som bestyrelsen bør følge op på.</p>
  `,

  /* ─── 8) Produkter, forretningsmodel og strategi ───────────────────────── */
  product: `
    <h3 class="tpl-subhead">Produkter, risikovurdering: <span class="tpl-risk lav">Lav</span></h3>
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
      <p>Selskabet producerer strukturelle kompositkomponenter til vindmøllevinger: bjælkepakker og pultruderede kulfiberlameller, rodmoduler og rodindsatser, næsekanter og lukkeprofiler samt service, reparation og reservedele. Omsætningen i 2025 fordelte sig på de fire områder med <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6">DKK 22,6, 10,3, 5,3 og 2,9 mio.</span>, beregnet til 55 %, 25 %, 13 % og 7 % af omsætningen. Hele omsætningen ligger i vindindustrien; marine- og forsvarsindustrien er et mål for diversificering. Produkterne er teknologisk krævende med betydelig procesviden, og produktionen er ordrebaseret. Selskabet ejer selv produktionsværktøjet til de fleste programmer, mens projektværktøjet til Block Island overgår til GE Vernova. Aktiverede udviklingsprojekter på DKK 0,6 mio. (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">balancen</span>) ejes af selskabet, men er ikke omfattet af virksomhedspantet, der alene omfatter debitorer (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S3">S3</span>).</p>
    </div>

    <h3 class="tpl-subhead">Forretningsmodel, risikovurdering: <span class="tpl-risk lav">Lav</span></h3>
    <em class="tpl-hint">Analyser virksomhedens nuværende forretningsmodel, herunder værditilbud.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Kontraktproduktion (B2B) for OEM-kunder i vindindustrien efter en build-to-print- og co-engineering-model, dels på rammeaftaler med rullende træk over 12 til 36 måneder, dels på projektordrer (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">ledelsesberetningen</span>). Prisen fastsættes ud fra kalkuleret materialeforbrug og cyklustid med indeksregulering på udvalgte råvarer. Selskabet konkurrerer på leveringstid, teknisk dokumentation og geografisk nærhed til kundernes vingefabrikker. EBITDA-marginen på 5,8 % ligger under medianen på 6,4 % for europæiske Tier-2-kompositleverandører (WindEurope).</p>
    </div>

    <h3 class="tpl-subhead">Strategi, risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
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
        <li><strong>Markedsstrategi:</strong> Kundebasen skal udvides, herunder mod marine- og forsvarsindustrien; selskabet er kvalificeret hos to nye kunder med første leverance i 2026 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>). Block Island-referencen forudsættes at give adgang til flere havvindprojekter hos GE Vernova, og et tilbud på Sunrise Wind (DKK 6-8 mio.) afventer afklaring i 1. kvartal 2027 (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Ordrebog">ordrebogen</span>). Omsætningen går til Danmark, øvrige EU og USA.</li>
        <li><strong>Produkt- og udviklingsstrategi:</strong> Større vinger og strukturelle kulfiberkomponenter. Udviklingsprojektet NC-Spar 92 (bjælkepakker til 92 meter vinger) blev sat i drift i 2025, og infusionslinje IL-2 (DKK 1,45 mio.) er idriftsat 1. september 2026 som følge af Block Island-ordren.</li>
        <li><strong>Distributionsstrategi:</strong> Direkte salg til OEM, ingen distributørled.</li>
      </ul>
      <p>Strategien er drevet af udbygningen af havvind og de større vinger, der øger materialeforbruget pr. MW.</p>
    </div>
  `,

  /* ─── 9) Marked, konkurrence, kunder og leverandører ───────────────────── */
  market: `
    <p class="tpl-note">[For alle afsnits punkter gælder: Vurderes risikoen "Lav" anføres alene få linjer med begrundelse. Vær opmærksom på sammenhæng til kvalitative svar i rating]</p>

    <h3 class="tpl-subhead">Marked, risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
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
      <p>Værdien af det europæiske marked for kompositkomponenter til vind ventes at vokse fra EUR 4,9 mia. i 2025 til EUR 6,7 mia. i 2030, svarende til 6,4 % p.a.; volumen steg 6,8 % i 2025, drevet af havvind og større rotorer. Efterspørgslen følger OEM'ernes ordreindgang og er dermed moderat cyklisk, men strukturelt voksende. Indtrængningsbarriererne er høje, da kvalificering hos OEM typisk tager 9 til 15 måneder (s. 22). Den største strukturelle risiko er asiatisk overkapacitet med vingesæt tilbudt 28-35 % under europæiske priser (s. 24).</p>
    </div>

    <h3 class="tpl-subhead">Konkurrence, risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
    <em class="tpl-hint">Kort analyse af konkurrenter samt hvordan virksomhedens værditilbud differentierer sig ift. disse, herunder:</em>
    <ul class="tpl-hints">
      <li>Væsentligste konkurrenter</li>
      <li>Konkurrenceparametre og differentiering ift. konkurrenterne / konkurrencefordele</li>
      <li>Evt. teknologiforskelle</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>OEM-leddet er koncentreret: de fire største OEM'er stod for 79 % af nyinstalleret kapacitet i Europa i 2025, og en stigende andel af de store vinger fremstilles på OEM'ernes egne fabrikker. Nordhavn konkurrerer med større europæiske kompositleverandører og asiatiske producenter på leveringstid, teknisk dokumentation og nærhed til kundernes fabrikker (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">ledelsesberetningen</span>). Antallet af selvstændige Tier-2-leverandører i Europa er faldet fra 176 i 2020 til 154 i 2025. De nærmeste konkurrenter på bjælkepakker og rodmoduler er Jutland Composites A/S i Esbjerg, Baltic Blade Parts i Szczecin og Anatolia Kompozit i Izmir (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">ledelsesberetningen</span>).</p>
      <table>
        <thead><tr><th>Nøgletal 2025</th><th style="text-align:right">Nordhavn Composite</th><th style="text-align:right">Tier-2-leverandører (WindEurope)</th></tr></thead>
        <tbody>
          <tr><td>EBITDA-margin (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8 %</span></td><td style="text-align:right;font-family:monospace">6,4 %</td></tr>
          <tr><td>Top-3 kunders andel af omsætningen (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">56 %</span></td><td style="text-align:right;font-family:monospace">61 %</td></tr>
          <tr><td>Materialeforbrug i % af omsætningen (vægtet gennemsnit)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">55,0 %</span></td><td style="text-align:right;font-family:monospace">55 %</td></tr>
          <tr><td>Debitordage (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">23</span></td><td style="text-align:right;font-family:monospace">67</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="tpl-subhead">Kunder, risikovurdering: <span class="tpl-risk hoj">Høj</span></h3>
    <em class="tpl-hint">Kort analyse af kunder, herunder:</em>
    <ul class="tpl-hints">
      <li>Hvem der er virksomhedens væsentligste kunder/de 3 største kunder eller kunder der udgør mere end 20 % af omsætningen?</li>
      <li>Er der en god spredning på kunder, eller er der afhængighed af enkelte kunder, og er udviklingen i retning af større eller mindre afhængighed?</li>
      <li>Hvilken indflydelse har kunderne overfor virksomheden, herunder hvem fastsætter pris og vilkår, er der høj/lav kundeloyalitet, er det nemt og billigt eller forbundet med store omkostninger for kunderne at substituere virksomhedens produkter?</li>
      <li>Er der evt. særlige kontraktmæssige forhold?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Top-3 kunder = <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Kunder">64 % af omsætningen i de første otte måneder af 2026</span>: GE Vernova (38,0 %), Vestas (18,0 %) og Siemens Gamesa (8,0 %). I 2025 var top-3 56 %. Koncentrationen stiger på grund af Block Island: uden ordren ville GE Vernova have ligget på ca. 20 %, på niveau med 2025, og GE Vernova udgør 45,3 % af ordrebogen for de næste fire kvartaler.</p>
      <p>Kunderne er store OEM'er med stærk forhandlingsposition, og i branchen stilles typisk årlige prisreduktionskrav på 2-4 % (WindEurope). Skifteomkostningerne er høje, fordi et kvalificeret kompositprogram er dyrt at flytte, og rammeaftalerne løber 12 til 36 måneder (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>). Særlige kontraktforhold: Block Island-aftalen har bod ved forsinkelse, cross-default og ejerskifteklausul, jf. afsnit 4 og 5.</p>
    </div>

    <h3 class="tpl-subhead">Leverandører, risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
    <em class="tpl-hint">Kort analyse af leverandører, herunder:</em>
    <ul class="tpl-hints">
      <li>Hvem er virksomhedens væsentligste leverandører?</li>
      <li>Er der afhængighed af enkelte leverandører, kritiske komponenter, landerisiko mv.? Hvis ja, hvad er virksomhedens handlingsplan for at sikre leverancer fra alternativ leverandør?</li>
      <li>Er der muligheden for skift af leverandør (opsigelsesvarsler, skifteomkostninger og navngivne alternative leverandører)?</li>
      <li>Hvordan er virksomhedens og leverandørens indbyrdes forhandlingsstyrke ift. pris og øvrige vilkår?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Væsentligste leverandører er Toray Europe (kulfiber) og Olin (epoxyharpiks) (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">budgettets note 1</span>). Ca. 60 % af forbruget er dækket af fastprisaftaler, og fastprisaftalen med Toray Europe udløber 31. december 2027. Kreditrammen hos Toray Europe er fuldt udnyttet, og leverandørerne kræver forudbetaling på de seneste ordrer. Rammeaftalen med GE Vernova kræver mindst to kvalificerede kilder for hver strukturel materialeposition og et sikkerhedslager svarende til 8 ugers kulfiberforbrug (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§2">§2.5</span>); skift af fiberleverandør kræver ny procesgodkendelse hos OEM, typisk 4-7 måneder. Forhandlingsstyrken over for kulfiberleverandørerne vurderes som lav.</p>
    </div>
  `,

  /* ─── 10) Finansiel analyse ────────────────────────────────────────────── */
  financial: `
    <h3 class="tpl-subhead">Regnskabsmæssige formalia</h3>
    <em class="tpl-hint">Revisionsform, regnskaber revideret eller udvidet gennemgang? Revisortype, fx statsautoriseret eller registreret revisor. Er der forbehold / revisionsanmærkninger? Hvem har udarbejdet perioderegnskab, budgetmateriale, følsomhedsanalyse og evt. koncernsammenstilling?</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 14">Årsrapport 2025 er revideret af Nordjysk Revision P/S (statsautoriseret revisor Henrik Bak) med en konklusion uden forbehold, men med en supplerende oplysning om ulovligt kapitalejerlån til direktøren (selskabslovens § 210) og en fremhævelse af, at anpartshaverlånet på t.DKK 500 ikke er efterstillet</span>. Påtegningerne for 2023 og 2024 er blanke (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">ansøgningen, afsnit 3.3</span>). Periodetal for januar-august 2026 er udtræk fra e-conomic af 14. september 2026 uden revision eller review. Budget 2026-28 (version 3 af 11. september 2026) er udarbejdet af selskabets økonomichef og controller og er ikke gennemgået af revisor; arket med følsomhedsberegninger er ikke indsendt. Koncernsammenstilling: ikke relevant, jf. ejerbogens koncernoversigt: <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">Nordhavn Composite A/S har ingen datterselskaber</span>.</p>
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
          <tr><td>EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6" data-line="EBITDA" data-col="2023">1,3</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6" data-line="EBITDA" data-col="2024">1,9</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="EBITDA" data-col="2025">2,4</span></td></tr>
          <tr><td>Egenkapital</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2023">3,5</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2024">4,8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2025">6,2</span></td></tr>
        </tbody>
      </table>
      <p>Trend: nettoomsætningen er vokset 47 % på to år, men indtjeningen følger ikke med. Bruttomarginen er faldet fra 46,3 % i 2024 til 45,0 % i 2025 på grund af stigende kulfiber- og harpikspriser, og EBITDA-marginen ligger fladt på 5,8 % i både 2024 og 2025. Væksten i 2025 kom fra helårseffekten af rodmodulprogrammet for Vestas, øget salg til Siemens Gamesa og nye kunder, mens leverancerne til GE Vernova faldt (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">ledelsesberetningen</span>). Resultatet ligger inden for ledelsens udmeldte forventninger (omsætning DKK 39-42 mio., EBITDA DKK 2,2-2,6 mio.). Ingen ekstraordinære poster. Egenkapitalen steg i 2024 fra 3,5 til 4,8 mio. med årets resultat på 0,7 mio. og en rettet kontant kapitalforhøjelse på 0,6 mio. (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">årsrapport 2024, note 11</span>), og i 2025 til 6,2 mio. med resultat 1,0 mio. og en kapitalforhøjelse på 0,4 mio.</p>
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
      <p>Budget 2026: nettoomsætning <strong>DKK 44,4 mio.</strong> (+8 %) og EBITDA DKK 2,7 mio. (margin 6,1 %) (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">ark Resultat</span>). Driver: GE Vernova-rammeaftalen med DKK 11,8 mio. indregnet i 2026. Bro: realiseret omsætning i januar-august på DKK 29,1 mio. (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat">periodetallene</span>) plus ordrebeholdning til levering i september på DKK 9,4 mio. og i fjerde kvartal på DKK 10,5 mio. (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Ordrebog">ordrebogen</span>) giver beregnet DKK 48,9 mio., ca. 10 % over helårsbudgettet. Forskellen skyldes, at budgettet periodiserer Block Island med 5,6 mio. i 3. kvartal og 6,2 mio. i 4. kvartal, mens leveringsplanen har DL-2 i september og DL-3 i december (afsnit 5). Budgettet for 2026 ser derfor forsigtigt ud, mens 2027 i højere grad hviler på optionen på 18 vingesæt og nye ordrer. Personaleomkostningerne stiger 8 % til DKK 14,6 mio. (gennemsnitligt 88 ansatte mod 84). Afskrivningerne følger brugstider på 8-10 år for produktionsanlæg og 4-6 år for forme og værktøj (årsrapportens note 7). Sammenligning med branchetal: EBITDA-marginen på 6,1 % ligger lidt under medianen på 6,4 % for europæiske Tier-2-kompositleverandører og i den nedre del af det typiske interval på 5-9 % (WindEurope), hvilket giver begrænset stødpude ved prispres eller forsinkelser.</p>
    </div>

    <p><strong>Perioderegnskab januar-august 2026 sammenlignet med budget</strong></p>
    <ul class="tpl-hints">
      <li>Forklar væsentlige afvigelser. Er det realistisk, at årsbudgettet nås? Hvis ikke, hvilket resultat estimeres for året?</li>
      <li>Er der afsat afskrivninger?</li>
      <li>Er der periodiseret?</li>
      <li>Krav til resterende del af regnskabsåret for budgetopfyldelse ("Need-to-Meet")</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Januar-august 2026: nettoomsætning DKK 29,1 mio. mod det bestyrelsesgodkendte budget på 30,1 mio. og EBITDA DKK 1,68 mio. mod 1,97 mio. (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat">ark Resultat</span>). Omsætningen var DKK <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat" data-line="Nettoomsætning" data-col="Q1 2026">10,60</span> mio. i 1. kvartal, <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat" data-line="Nettoomsætning" data-col="Q2 2026">11,10</span> mio. i 2. kvartal og <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat" data-line="Nettoomsætning" data-col="Jul-aug 2026">7,38</span> mio. i juli-august; 3. kvartal er ikke afsluttet. Afvigelsen skyldes primært indkøringen af en ny form i 1. kvartal (engangseffekt) og to kundeordrer på i alt DKK 0,5 mio., der er udskudt til 4. kvartal. EBITDA-marginen er løftet fra 5,1 % i 1. kvartal til 6,3 % i 2. kvartal og ligger på 6,0 % i juli-august, hvor juli er præget af ferie og vedligeholdsstop. Afskrivninger er bogført; der er ikke afsat skat, og igangværende arbejder er værdiansat uden avance. Budget version 3 af 11. september 2026 fastholder helåret på omsætning DKK 44,4 mio. og EBITDA 2,7 mio. Need-to-Meet: DKK 15,3 mio. i omsætning og 1,02 mio. i EBITDA i september-december, hvor ordrebogen til levering i perioden er DKK 19,9 mio.</p>
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
      <p>Aktiverne vurderes realistisk værdiansat. Omsætning indregnes ved levering og risikoovergang, og der er ikke indregnet omsætning efter produktionsmetoden (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6">note 1</span>). Igangværende arbejder er ifølge periodetallene <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Balance">værdiansat til medgåede omkostninger uden avance</span>. Tilgodehavender fra salg på DKK 2,55 mio. er koncentrerede, idet de tre største kunder udgør 78 % pr. balancedagen, men modparterne er store, børsnoterede eller statsligt understøttede industrikoncerner, og debitordagene er 23 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">note 8</span>). Ejendommen er finansieret med et 20-årigt realkreditlån, maskinerne med anlægslån og leasing (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">note 10</span>); realkreditlånet fremgår ikke af bankens prioritetsoversigt, jf. afsnit 5. Likviditetsgrad 250 %. Soliditet 44,3 %; anpartshaverlånet på DKK 0,5 mio. er ikke efterstillet og kan ikke regnes som ansvarlig kapital, før tilbagetrædelseserklæring foreligger. Gæld i alt/EBITDA 3,3 og nettorentebærende gæld/EBITDA 1,5 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">nøgletal</span>). Eventualforpligtelser: lejeforpligtelser på DKK 1,98 mio., sædvanlige produktgarantier og en opfyldelsesgaranti over for GE Vernova på USD 207.500. Mellemregninger: kapitalejerlånet til direktøren er indfriet, og der er intet mellemværende med ledelsen ultimo 2025.</p>
    </div>

    <p><strong>Budget (balance)</strong></p>
    <ul class="tpl-hints">
      <li>Årsagsforklar og analyser på de væsentlige ændringer i forhold til seneste årsregnskab</li>
      <li>Er gældsgearingen (nettorentebærende gæld/EBITDA) tilfredsstillende?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Budget ultimo 2026: egenkapital DKK 7,35 mio., soliditet <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Balance" data-line="Soliditetsgrad %" data-col="2026E">47,3 %</span> og gæld i alt/EBITDA <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Balance" data-line="Gæld / EBITDA" data-col="2026E">3,0</span> efter etablering af faciliteten. Væsentlige ændringer: tilgodehavender fra salg stiger fra DKK 2,55 mio. til 3,55 mio. på grund af 60 dages kredit på GE Vernova-aftalen, eksportfaciliteten er trukket med DKK 0,5 mio. ultimo 2026, og infusionslinje IL-2 (investering DKK 1,45 mio.) aktiveres. Nettorentebærende gæld/EBITDA ventes at falde fra 1,5 til 1,1, hvilket vurderes tilfredsstillende.</p>
    </div>

    <p class="tpl-note">Ved akkvisitioner: Købsmultipler? <em>Ikke relevant for denne sag.</em></p>

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
      <p>Pengestrømmen fra driftsaktiviteten var DKK 0,61 mio. i 2023 og 0,80 mio. i 2024 (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9">Aarsrapport 2024</span>); årsrapporten for 2025 indeholder ingen pengestrømsopgørelse. Arbejdskapitalen bindes i takt med væksten: debitordage 23 i 2025 og 29 i budgettet (60 dages kredit på GE Vernova-aftalen), varelagerdage 52 i 2025 og 42 i budgettet, kreditordage 36. Investeringerne i 2026 udgør DKK 1,5 mio., primært infusionslinje IL-2 til Block Island-ordren. Likviditetsprognosen i budget version 3 er afstemt til de faktiske tal pr. 31. august 2026: likvide beholdninger DKK 2,08 mio. og træk på driftskreditten 1,12 af 1,50 mio. (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Balance">ark Balance</span>). Likviditeten bunder i <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">DKK 0,93 mio. ultimo oktober 2026</span>, hvor driftskreditten er fuldt udnyttet, og der er ingen uudnyttet ramme, før faciliteten og udvidelsen af driftskreditten etableres 1. november. Bankansøgningens budget (version 2.2 fra maj) viste et lavpunkt på 0,62 mio. i november med 1,30 mio. i uudnyttet ramme. Det disponible i lavpunktet er dermed faldet fra 1,92 til 0,93 mio., fordi trækket på driftskreditten er 0,6 mio. større end forudsat (1,50 mod 0,90). I november modtages GE Vernovas betaling for DL-2 på ca. 4,3 mio., og driftskreditten nedbringes til 0,45 mio. Afdrag på den langfristede gæld udgør DKK 0,45 mio. i 2026 (årsrapportens note 10), og rentedækningen (EBITDA/finansielle omkostninger) er 6,0 i budgettet for 2026. Med EBITDA på DKK 2,70 mio. og finansielle omkostninger på DKK 0,45 mio. i 2026 (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">budgettet</span>) er gældsserviceringsgraden på normaliserede afdrag 3,0, beregnet som 2,70 / (0,45 + 0,45).</p>
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
        <li><strong>Low case</strong> (budget 2026 med omsætning -15 % og EBITDA-margin -2 procentpoint): omsætning DKK 37,7 mio. og EBITDA ca. DKK 1,5 mio. (4,1 %) mod budgetterede 2,7 mio. Med uændret gæld på DKK 8,2 mio. stiger gæld/EBITDA til ca. 5,3 og bryder covenant C2 på maks. 4,0. Beregnet af budgettets omsætning på <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">DKK 44,40 mio.</span> og gæld i alt på <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Balance">DKK 8,20 mio.</span> ultimo 2026: 44,4 x 0,85 = 37,7; 37,7 x 4,1 % = 1,55; 8,2 / 1,55 = 5,3.</li>
        <li><strong>Betalingstidspunkt:</strong> Forsinkes GE Vernovas betaling for DL-2 (DKK 4,32 mio., forfald 24. november 2026) til januar 2027, ender november 2026 på DKK -0,19 mio. og december 2026 på DKK -1,37 mio. før træk på eksportfaciliteten. Med faciliteten og den udvidede driftskredit er der ca. DKK 5,2 mio. i uudnyttet ramme, så forsinkelsen kan bæres. Etableres faciliteten ikke 1. november, mangler selskabet ca. DKK 0,8 mio. i november for at holde det interne minimum på 0,6 mio. (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">likviditetsprognosen, bemærkning 2</span>).</li>
        <li><strong>Likviditetsmæssig nulpunktsomsætning</strong> (budget 2026): kapacitetsomkostninger på DKK 17,4 mio. plus renter på 0,45 mio. og afdrag på 0,45 mio. dækket af en bruttomargin på 45,3 % giver ca. DKK 40,4 mio. mod budgetterede 44,4 mio., dvs. ca. 9 % luft.</li>
        <li><strong>Valutafølsomhed:</strong> Der er ingen terminsforretninger. Et fald i USD på 10 % reducerer provenuet af Block Island-kontraktens 2026-del med ca. DKK 0,92 mio. (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 2">ansøgningen, afsnit 2.2</span>), og et fald på 5 % reducerer resultat før skat med ca. t.DKK 455 på årsbasis (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>). Væsentlig uafdækket risiko, jf. afsnit 5.</li>
        <li><strong>Rentefølsomhed:</strong> +1 procentpoint øger renteomkostningerne med ca. t.DKK 23 på den nuværende variabelt forrentede gæld (note 18) og med yderligere ca. t.DKK 45 ved fuldt træk på eksportfaciliteten på DKK 4,5 mio. Begrænset.</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">Konklusion, risikovurdering: <span class="tpl-risk mid">Middel</span></h3>
    <ul class="tpl-hints">
      <li>Realismen i budgetter? Er den budgetterede indtjening tilfredsstillende?</li>
      <li>Vurderes aktiverne realistisk værdiansat, og er der risiko for ekstraordinært store prisfald i tilfælde af konkurs?</li>
      <li>Er gældsserviceringsevnen tilfredsstillende?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Budgettet for 2026 vurderes realistisk og snarere forsigtigt: otte måneders realiseret omsætning og ordrebogen for resten af året dækker ca. 110 % af helårsbudgettet, fordi budgettet periodiserer Block Island anderledes end leveringsplanen. 2027 og 2028 hviler i højere grad på rammeaftaler, og ordrebogen dækker 60,6 % af de næste fire kvartalers budgetterede omsætning. Aktiverne vurderes realistisk værdiansat, men realisationsværdien ved konkurs er begrænset: maskinerne er vurderet til DKK 2,1 mio. ved hurtig afvikling (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S1">S1</span>), og bankens prioritetsoversigt viser en samlet behæftelse på DKK 4,1 mio. uden realkreditlånet (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S2">S2</span>). Med lånet er behæftelsen beregnet til ca. 147 % af den offentlige vurdering, jf. afsnit 5. Gældsserviceringsevnen er tilstrækkelig i basisscenariet, men følsom over for GE Vernovas betalingstidspunkt, USD-kursen og en lavere indtjening (low case bryder covenant C2).</p>
    </div>

    <h3 class="tpl-subhead">Nøgletalstabel</h3>
    <p class="tpl-note">[Indsæt "Tabel" med regnskabs- og budgettal (resultatopgørelse, balance og cash-flow) fra Excel-ark eller udtræk fra virksomhedens materiale.]</p>
    <table>
      <thead><tr><th>Nøgletal</th><th style="text-align:right">2023</th><th style="text-align:right">2024</th><th style="text-align:right">2025</th></tr></thead>
      <tbody>
        <tr><td>Bruttomargin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2023">45,7 %</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2024">46,3 %</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2025">45,0 %</span></td></tr>
        <tr><td>EBITDA-margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2023">4,6 %</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2024">5,8 %</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8 %</span></td></tr>
        <tr><td>Soliditetsgrad</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2023">37,2 %</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2024">42,9 %</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2025">44,3 %</span></td></tr>
        <tr><td>Gæld / EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2023">4,5×</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2024">3,4×</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3,3×</span></td></tr>
        <tr><td>Likviditetsgrad</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2023">216,7 %</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2024">246 %</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2025">250 %</span></td></tr>
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
          <td><span class="tpl-blank">[dato]</span></td>
          <td style="width:30%"><strong>Indstillingsniveau:</strong> <span class="tpl-blank">Kundechef</span> · <strong>Initial:</strong> <span class="tpl-blank">[initialer]</span></td>
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
          <td><span class="tpl-blank">[dato]</span></td>
          <td style="width:30%"><strong>Bevillingsinstans:</strong> <span class="tpl-blank">Kreditkomité</span> · <strong>Initial:</strong> <span class="tpl-blank">[initialer]</span></td>
        </tr>
        <tr>
          <td class="label" style="vertical-align:top">Bemærkninger / referat fra kreditkomité / BBU / Bestyrelsen:</td>
          <td colspan="2"><span class="tpl-blank">[Referat fra bevillingsmøde]</span></td>
        </tr>
      </tbody>
    </table>
  `,

  /* ─── Bilag 1: Vilkår ──────────────────────────────────────────────────── */
  appendix1: `
    <p class="tpl-note">[For samtlige afsnit gælder, at ikke relevant indhold slettes]</p>

    <h3 class="tpl-subhead">Engagement</h3>
    <table>
      <thead><tr><th>Eksisterende + ansøgt engagement</th><th style="text-align:right">DKK mio.</th><th>Løbetid</th><th>Første afdrag / trækperiode</th><th>Første rente</th><th>Låneprofil</th></tr></thead>
      <tbody>
        <tr><td>Eksisterende engagement med EIFO</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Ratingberegning_2026-0184.pdf" data-page="s. 1">0,0</span></td><td colspan="4"><span class="tpl-blank">[bekræftes i EIFOs engagementsoversigt]</span></td></tr>
        <tr><td><strong>EIFO-eksportkaution, ny, 80 % dækning pari passu af eksportfacilitet på DKK 4,5 mio.</strong></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">3,6</span></td><td><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">30 mdr. (1.11.2026-30.4.2029)</span></td><td>Revolverende træk fra 1.11.2026</td><td>Præmie 1,10 % p.a.</td><td>Revolverende; trækloft 3,0 mio. i 1. kvt. 2027 og 2,0 mio. fra 30.6.2027</td></tr>
        <tr><td><strong>I alt EIFO</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">3,6</td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>

    <p><strong>Kautionstager / Medfinansierende pengeinstitut:</strong> Nordjyske Bank A/S, kontakt: erhvervsrådgiver <span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">Lars Thomsen, lth@nordjyskebank.dk</span></p>
    <p><strong>Tabsmandater:</strong> Ingen <span class="tpl-blank">[eller angiv mandat]</span></p>
    <ul>
      <li>Tjekliste for valgte tabsmandat er udfyldt <span class="tpl-blank">[ja/nej]</span></li>
      <li><span class="tpl-blank">Maks. to linjer begrundelse for valg af "ingen tabsmandat", hvis kriterier for mandat er opfyldt</span></li>
    </ul>

    <h3 class="tpl-subhead">Marginal / præmie</h3>
    <ul>
      <li>Eksportfacilitet: variabel CIBOR3-rente med et tillæg på <strong>3,00 procentpoint</strong> (5,15 % p.a. ved CIBOR3 på 2,15 % pr. 1. juni 2026); driftskreditten: CIBOR3 med tillæg af 4,00 procentpoint (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">ansøgningen, afsnit 4.2</span>)</li>
      <li>Præmie (EIFO-kaution): forudsat <strong>1,10 % p.a.</strong> af udestående garanteret beløb, ca. DKK 39.600 p.a. ved fuldt træk; viderefaktureres til selskabet</li>
      <li><span class="tpl-blank">Maks. to linjer med begrundelse for afvigelse fra beregnet marginal/præmie</span></li>
    </ul>

    <h3 class="tpl-subhead">Stiftelses- / etableringsgebyr</h3>
    <p>Standard: 0,75 % af hovedstol + DKK 15.000 pr. facilitet, svarende til DKK 42.000 af kautionen på DKK 3,6 mio. Bankens etableringsprovision på eksportfaciliteten er 0,75 % af DKK 4,5 mio., i alt DKK 33.750, og provisionen af uudnyttet ramme er 0,50 % p.a.</p>

    <h3 class="tpl-subhead">Tilsagnsprovision / Break fee</h3>
    <ul>
      <li>Tilsagnsprovision: ikke relevant for en eksportkaution. Banken opkræver provision af uudnyttet ramme på 0,50 % p.a. (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">ansøgningen, afsnit 4.2</span>)</li>
      <li>Break fee: ikke relevant for en eksportkaution</li>
    </ul>

    <h3 class="tpl-subhead">Exit fee</h3>
    <p>Ingen, ikke relevant for en eksportkaution.</p>

    <h3 class="tpl-subhead">Sikkerheder [lån og garantier]</h3>
    <p><strong>Eksisterende sikkerheder over for Nordjyske Bank, som EIFO skal sidestilles i:</strong></p>
    <ul>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S1">3,2 mio. løsørepantebrev i maskiner og produktionsanlæg</span>, tinglyst 22. januar 2026. Realisationsværdi ved hurtig afvikling DKK 2,1 mio.</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S2">2,5 mio. ejerpantebrev i Havnegade 42</span> (2. prioritet efter ejerpantebrev på DKK 1,6 mio. ifølge bankens oversigt), tinglyst 14. januar 2026. Oversigten viser en samlet behæftelse på 100 % af den offentlige vurdering på DKK 4,1 mio., men medtager ikke realkreditlånet (restgæld ca. DKK 1,9 mio.), der efter årsrapportens note 10 har pant i ejendommen. Med lånet er behæftelsen ca. 147 %, og ejerpantebrevet på DKK 2,5 mio. har reelt ingen dækning. Tingbogsattest indhentes.</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S3">4,5 mio. virksomhedspant i debitorer</span>, tinglyst 20. januar 2026. Omfatter ikke varelager og igangværende arbejder.</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S4">1,0 mio. personlig selvskyldnerkaution fra Anders Christensen</span>, underskrevet 15. januar 2026. Opdateret formueopgørelse mangler.</li>
    </ul>
    <p><strong>Nye sikkerheder og dokumenter, der mangler:</strong></p>
    <ul>
      <li>Selskabskaution fra Nordhavn Holding ApS, CVR-nr. 41096623, maks. <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S5">DKK 2,0 mio.</span>: <strong>udkast, ikke underskrevet</strong>, og selskabsretlig beslutning mangler.</li>
      <li>Tilbagetrædelseserklæring fra Anders Christensen personligt vedr. anpartshaverlån på DKK 0,5 mio.: <strong>mangler</strong>.</li>
      <li>Tinglyste allonger eller ny håndpantsætningserklæring om EIFOs sidestilling i løsørepant, ejerpantebrev og virksomhedspant: <strong>foreligger ikke pr. 4. august 2026</strong>.</li>
      <li>Aktiepant indgår ikke i sikkerhedspakken, og der er ingen rådighedsindskrænkninger noteret i ejerbogen.</li>
    </ul>

    <h3 class="tpl-subhead">Covenants og erklæringer [lån og garantier]</h3>
    <ul>
      <li><strong>C1 Soliditet:</strong> minimum 35,0 %, målt kvartalsvis; anpartshaverlånet medregnes ikke som egenkapital uden tilbagetrædelseserklæring.</li>
      <li><strong>C2 Gæld/EBITDA:</strong> maksimum 4,0 (seneste 12 måneder).</li>
      <li><strong>C3 Udbyttebegrænsning:</strong> ingen udlodning, så længe faciliteten er trukket med mere end DKK 1,0 mio., og aldrig over 30 % af årets resultat.</li>
      <li><strong>C4 Anpartshaverlån:</strong> ingen afdrag, renter eller andre betalinger på lånet i kautionsperioden.</li>
      <li><strong>C5 Ejerskifte:</strong> genforhandling, hvis mere end 30 % af kapitalen skifter ejer, eller Anders Holding ApS ophører med at være majoritetsejer.</li>
      <li><strong>C6 Valutasikring:</strong> mindst 70 % af den resterende kontraktsum på GEV-BI-2025-0447 sikres senest 1. december 2026; skriftlig valutapolitik vedtages senest 30. november 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">tillægget, pkt. 3</span>).</li>
      <li>Første måling pr. 31. december 2026 på reviderede tal (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">ansøgningen, afsnit 4.3</span>).</li>
      <li>Forudsætning for opfyldelse af VK 1-3 [grønne covenants]: <span class="tpl-blank">[N/A, ikke grøn finansiering]</span></li>
    </ul>

    <h3 class="tpl-subhead">Rapporteringer [lån og garantier]</h3>
    <ul>
      <li>Revideret årsrapport senest 4 måneder efter regnskabsårets udløb (R2)</li>
      <li>Kvartalsregnskab med balance og likviditetsopgørelse samt covenanterklæring senest 30 dage efter kvartalets udløb (R1, R3)</li>
      <li>Debitorliste månedligt, så længe trækket overstiger DKK 3,0 mio.; ordrebogsrapport og rullende 12 måneders likviditetsbudget kvartalsvis (R4-R6)</li>
      <li>Straksunderretning ved ordreændringer over DKK 1,0 mio. og ved ændringer i direktion, revisor eller ejerkreds, herunder udnyttelse af warrants (R7, R8)</li>
      <li>Koncernsammenstilling udarbejdet af revisor? Nej, selskabet har ingen datterselskaber.</li>
    </ul>

    <h3 class="tpl-subhead">Særvilkår [EIFO-kautioner]</h3>
    <p>Kautionspræmiesatsen er fastsat til <strong>1,10 %</strong> p.a. Kautionstager har oplyst, at rentemarginalen på Kreditfaciliteten udgør <strong>3,00 %</strong> p.a. Hvis Kautionstager forhøjer rentemarginalen, skal EIFO orienteres og præmien til EIFO forhøjes procentvis tilsvarende.</p>
    <p><strong>Fravigelser og/eller yderligere krav i forhold til de Generelle vilkår:</strong> <span class="tpl-blank">[Formulering skal følge formuleringen i Særvilkårskataloget. Indfør vilkår her]</span></p>

    <p><strong>Inden udstedelse af police, skal følgende være opfyldt og dokumenteret:</strong></p>
    <ul>
      <li>Underskrevet tilbagetrædelseserklæring fra Anders Christensen på anpartshaverlånet på DKK 0,5 mio. (B2)</li>
      <li>Underskrevet selskabskaution fra Nordhavn Holding ApS med selskabsretlig beslutning (B1)</li>
      <li>Dokumentation for terminssikring af mindst 70 % af den resterende kontraktsum eller bindende ordre herom (B4, C6)</li>
      <li>Tinglyste allonger om EIFOs sidestilling i løsørepant, ejerpantebrev og virksomhedspant</li>
      <li>Tingbogsattest for Havnegade 42, der viser realkreditlånets prioritet</li>
      <li>Bekræftet kopi af rammeaftale GEV-BI-2025-0447 med betalingsbetingelser (B5): modtaget 16. september 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">tillægget, pkt. 5</span>)</li>
    </ul>

    <h3 class="tpl-subhead">Udbetalingsbetingelser [lån og garantier]</h3>
    <ul>
      <li><strong>Træk:</strong> Revolverende træk på eksportfaciliteten mod dokumenteret materialefaktura eller opgjort igangværende arbejde inden for rammen på DKK 4,5 mio.; maks. træk DKK 3,0 mio. i 1. kvartal 2027 og DKK 2,0 mio. fra 30. juni 2027 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">ansøgningen, afsnit 4.1</span>).</li>
      <li><strong>Første udbetaling:</strong> tidligst ved etableringen 1. november 2026 og forudsætter, at betingelserne B1-B5 er opfyldt, herunder endeligt kautionstilsagn fra EIFO (B3) senest 31. oktober 2026. Udbetalingsfrist: <span class="tpl-blank">[dato]</span></li>
    </ul>

    <h3 class="tpl-subhead">Pengeinstitut-engagement</h3>
    <table>
      <thead><tr><th>Nordjyske Bank</th><th style="text-align:right">DKK mio.</th><th>Løbetid</th><th>Rente</th></tr></thead>
      <tbody>
        <tr><td>Anlægslån, eksisterende</td><td style="text-align:right;font-family:monospace">1,8</td><td>Restløbetid 6 år og 3 mdr.</td><td>4,2 %</td></tr>
        <tr><td>Driftskredit, udvidet fra 1,5 pr. 1.11.2026</td><td style="text-align:right;font-family:monospace">2,2</td><td>Til 30.6.2027, derefter årlig fornyelse</td><td>CIBOR3 + 4,00 %</td></tr>
        <tr><td>Eksportfacilitet, ny (heraf EIFO-kaution 3,6)</td><td style="text-align:right;font-family:monospace">4,5</td><td>1.11.2026 til 30.4.2029</td><td>CIBOR3 + 3,00 %</td></tr>
        <tr><td><strong><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">Bruttoengagement i alt</span></strong></td><td style="text-align:right;font-family:monospace;font-weight:600">8,5</td><td></td><td></td></tr>
        <tr><td>Bankens nettorisiko efter EIFO-kaution</td><td style="text-align:right;font-family:monospace">4,9</td><td></td><td></td></tr>
      </tbody>
    </table>

    <h3 class="tpl-subhead">Pengeinstitut sikkerheder</h3>
    <p><strong>Eksisterende:</strong></p>
    <ul>
      <li>Ejerpantebreve i Havnegade 42 på DKK 1,6 mio. og DKK 2,5 mio., håndpantsat til banken, med prioritet efter realkreditlånet (se ovenfor)</li>
      <li>Løsørepantebrev i maskiner, DKK 3,2 mio.</li>
      <li>Virksomhedspant i debitorer, DKK 4,5 mio.</li>
      <li>Personlig kaution fra Anders Christensen, DKK 1,0 mio.</li>
    </ul>
    <p><strong>Nye / forhøjede:</strong></p>
    <ul>
      <li>Selskabskaution fra Nordhavn Holding ApS, maks. DKK 2,0 mio. (udkast)</li>
      <li>EIFO sidestilles med banken i alle sikkerheder og er ikke efterstillet (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">ansøgningen, afsnit 4.5</span>)</li>
    </ul>

    <h3 class="tpl-subhead">Interkreditoraftale</h3>
    <p>Standard med overtræksret DKK 0,5 mio. i op til tre måneder uden involvering af EIFO (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">ansøgningen, afsnit 4.5</span>).</p>
  `,

  /* ─── Bilag 2: ESG ─────────────────────────────────────────────────────── */
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
        <li><strong>Ledelsessystem:</strong> ISO 9001:2015-certificeret (Bureau Veritas, gyldig til 13. februar 2027; seneste opfølgende audit i december 2025 uden væsentlige afvigelser). Implementering af ISO 14001 er besluttet med henblik på certificering i 2027 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 11">CSR/ESG-redegørelsen</span>).</li>
        <li><strong>Politikker:</strong> Code of Conduct for leverandører af 1. juli 2024 og politik af 14. marts 2024 om kvindelige kandidater til lederstillinger. Øvrige nedskrevne ESG-politikker er ikke dokumenteret. <span class="tpl-blank">[øvrige politikker]</span></li>
        <li><strong>Leverandørkrav:</strong> Code of Conduct er tiltrådt af leverandører svarende til 82 % af det samlede indkøb.</li>
        <li><strong>Risikokortlægning:</strong> De væsentligste påvirkninger er energiforbrug, spild af fiber og harpiks, kemikaliehåndtering og arbejdsmiljø ved slibning og limning. Scope 3 er endnu ikke opgjort.</li>
        <li><strong>Initiativer:</strong> LED-belysning og varmegenvinding på autoklaven (energiintensiteten forbedret 14,7 %), spild reduceret fra 8,6 % til 7,4 %, samarbejde om genanvendelse af hærdet epoxykomposit og punktudsugning ved slibepladserne.</li>
        <li><strong>Whistleblower:</strong> Ordning etableret via ekstern udbyder; ingen indberetninger i 2025.</li>
        <li><strong>Arbejdsmiljø:</strong> 3 ulykker med fravær i 2025 (LTIF 8,2 mod 11,6 i 2024). Arbejdstilsynet gav en vejledning, ingen påbud.</li>
        <li><strong>Auditprogrammer:</strong> ISO 9001 (aktiv) og ISO 14001 (under implementering). Redegørelsen er afgivet frivilligt og er ikke revideret.</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">[For EIFO-produkter &gt; DKK 50 mio. eller på EIFOs opmærksomhedsliste]</h3>
    <p class="tpl-note">Ikke relevant for denne sag (facilitet under DKK 50 mio.). Afsnittet kan slettes.</p>
    <p><strong>ESG-risici:</strong> <em class="tpl-hint">ESG's vurdering angiver følgende konklusion: [indsæt 1) Overordnet konklusion, 2) Illustration i form af et spidergram der viser den nuværende og ønskede ESG performance af virksomhedens ledelsessystem, 3) Illustration af ESG's vurdering af forretningens ESG-risikoprofil]</em></p>

    <h3 class="tpl-subhead">Konklusion, risikovurdering: <span class="tpl-risk lav">Lav</span></h3>
    <p>ESG-håndteringen vurderes tilfredsstillende for facilitetens størrelse og branche. Selskabets fokus på vedvarende energi (vindmøllekomponenter) understøtter EIFOs strategiske ESG-fokus.</p>
  `,

  /* ─── Bilag 3: Koncerndiagram ──────────────────────────────────────────── */
  appendix3: `
    <p class="tpl-note">[Hvis der ikke foreligger et diagram, kan det evt. oprettes via excel-filen "Koncernstruktur Template", der ligger i Templafy]</p>

    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Udkast</span>
      <p>Ejerkreds og koncernforhold pr. 30. juni 2026 (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">ejerbogen, koncernoversigt</span>). Låntager har ingen datterselskaber og indgår ikke i en juridisk koncern:</p>
      <pre style="font-family: var(--mono); font-size: 11.5px; line-height: 1.5; background: var(--c-surface-2); padding: 10px 14px; border-radius: 6px; margin: 6px 0;">
Anders Christensen
  | 100 %
Anders Holding ApS
  +- 50,7 % -> Nordhavn Composite A/S &lt;- Erhvervsfonden 23,6 %
  |            CVR 38427156           &lt;- Maria Lindbjerg 15,6 %
  |            (låntager)             &lt;- Industrifonden A/S 10,1 %
  |
  +- 66,7 % -> Nordhavn Holding ApS   &lt;- Maria Lindbjerg 33,3 %
               CVR 41096623
                 | 100 %
               Nordhavn Production ApS
               CVR 41096631 (søsterselskab)
      </pre>
      <table>
        <thead><tr><th>Selskab</th><th>CVR</th><th>Ejerandel i låntager</th><th>Aktivitet</th></tr></thead>
        <tbody>
          <tr><td><strong>Nordhavn Composite A/S</strong> (låntager)</td><td style="font-family:monospace">38427156</td><td>-</td><td>Kompositkomponenter til vindindustrien, Frederikshavn og Sæby</td></tr>
          <tr><td>Anders Holding ApS</td><td style="font-family:monospace">36710984</td><td>50,7 %</td><td>Holdingselskab, ejet 100 % af Anders Christensen</td></tr>
          <tr><td>Nordhavn Holding ApS</td><td style="font-family:monospace">41096623</td><td>0 %</td><td>Holdingselskab (Anders Holding ApS 66,7 %, Maria Lindbjerg 33,3 %); foreslået kautionist</td></tr>
          <tr><td>Nordhavn Production ApS</td><td style="font-family:monospace">41096631</td><td>0 %</td><td>Overfladebehandling, efterbearbejdning og pakning; 6 ansatte</td></tr>
        </tbody>
      </table>
      <p>Mellemværendet med Nordhavn Production ApS udgjorde DKK 62.000 i låntagers favør pr. 30. juni 2026, og samhandlen sker på markedsvilkår. Nordhavn Production ApS indgår ikke i sikkerhedspakken.</p>
    </div>

    <h3 class="tpl-subhead">Bilagsliste (sagsmappe)</h3>
    <table>
      <thead><tr><th style="width:28px">#</th><th>Dokument</th><th>Type</th><th>Dato</th></tr></thead>
      <tbody>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">1</td><td>Aarsrapport_2025.pdf</td><td>Årsrapport</td><td style="color:var(--c-text-2)">8. apr. 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">2</td><td>Aarsrapport_2024.pdf</td><td>Årsrapport</td><td style="color:var(--c-text-2)">27. mar. 2025</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">3</td><td>Aarsrapport_2023.pdf</td><td>Årsrapport</td><td style="color:var(--c-text-2)">18. apr. 2024</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">4</td><td>Periodetal_jan-aug_2026.xlsx</td><td>Periodetal</td><td style="color:var(--c-text-2)">14. sep. 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">5</td><td>Budget_2026-28_v3.xlsx</td><td>Budget</td><td style="color:var(--c-text-2)">11. sep. 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">6</td><td>Bankansoegning_Nordjyske_Bank.pdf</td><td>Ansøgning</td><td style="color:var(--c-text-2)">23. sep. 2026 (tillæg til ansøgning af 2. jun. 2026)</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">7</td><td>GE_Vernova_rammekontrakt.pdf</td><td>Kontrakt</td><td style="color:var(--c-text-2)">14. jul. 2026 (underskrevet 9. dec. 2025)</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">8</td><td>Sikkerhedsdokumenter.pdf</td><td>Sikkerhed</td><td style="color:var(--c-text-2)">4. aug. 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">9</td><td>Ejerbog_2026.pdf</td><td>Selskab</td><td style="color:var(--c-text-2)">3. aug. 2026</td></tr>
      </tbody>
    </table>
  `,
};

/* ── English template variant ─────────────────────────────────────────────────
   Faithful translation of the Danish template above. Figures, company names,
   document names and citation attributes (data-doc / data-page / data-line /
   data-col) are kept byte-identical so citations still resolve against
   window.CASE_DOCS. Selected at module level when window.CW_LANG === 'en'. */
const SEC_EN = {
  background: `
    <h3 class="tpl-subhead">Background</h3>
    <ul class="tpl-hints">
      <li>Brief introduction (two lines) covering the company's principal activities and business model and, where relevant, its "reason for existence"</li>
      <li>Brief history: mention any important events/milestones within the last 5 years</li>
      <li>The bank's motive for inviting EIFO into the financing</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p><strong>Activities:</strong> Nordhavn Composite A/S develops and manufactures fibre-reinforced composite components for the wind industry, primarily structural blade components such as carbon fibre spar caps, root modules and leading edges, plus service and spare parts. The company is a subcontractor to wind turbine manufacturers (OEMs) under a build-to-print and co-engineering model and produces in Frederikshavn and Sæby (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">management review</span>). The largest customers are GE Vernova, Vestas and Siemens Gamesa.</p>
      <p><strong>History (last 5 years):</strong></p>
      <ul>
        <li>2021-2025: Net revenue has grown from DKK 19.4 million to <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">DKK 41.1 million</span>, and EBITDA from DKK 0.6 million to DKK 2.4 million.</li>
        <li>2022: Industrifonden A/S joins as a shareholder (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 1">register of shareholders</span>).</li>
        <li>2024: ISO 9001 certification, the root module programme for Vestas goes into operation in the second half of the year, and a directed capital increase of DKK 0.6 million is subscribed by Industrifonden A/S, Anders Holding ApS and Erhvervsfonden (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">annual report 2024, note 11</span>).</li>
        <li>2025: Revenue growth of 25.3%, investment in a CNC milling cell and a capital increase of DKK 0.4 million subscribed pro rata by all shareholders.</li>
        <li>9 December 2025: <span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">Framework agreement GEV-BI-2025-0447 with GE Vernova</span> for 62 blade sets for Block Island Wind Farm Phase II, contract value USD 4.15 million (approx. DKK 28.4 million), delivered in 2026 and 2027.</li>
        <li>2026: DL-1 delivered on 27 May and DL-2, the contract's critical milestone, delivered on 22 September, three days before the deadline (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">the bank's amendment of 23 September 2026</span>).</li>
      </ul>
      <p><strong>The bank's motive:</strong> Nordjyske Bank has been the company's only bank since 2017 and considers the relationship sound, but the Block Island order concentrates the risk: repayment depends on one customer's payment in Q4 2026, payment is made in USD, the carbon fibre price has risen 22%, and the EBITDA margin is thin. Without EIFO the bank's gross exposure of DKK 8.5 million would exceed its internal limit of DKK 6.0 million in net exposure; with the guarantee the net risk is DKK 4.9 million (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 2">application, section 2</span>).</p>
    </div>

    <h3 class="tpl-subhead">Loan purpose</h3>
    <ul class="tpl-hints">
      <li>Reason for the loan application</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>On behalf of Nordhavn Composite A/S, Nordjyske Bank is applying for an <strong><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">EIFO export guarantee of DKK 3.6 million</span></strong>, equal to 80% of a new revolving export facility of DKK 4.5 million. Together with an increase of the working capital facility from DKK 1.5 million to DKK 2.2 million and own funds, the facility is to finance a total capital requirement of <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">DKK 7.0 million</span> for the Block Island order: carbon fibre and resin purchases DKK 2.8 million, work in progress DKK 2.4 million and working capital until GE Vernova's payment in Q4 2026 DKK 1.8 million. The new external financing applied for is DKK 5.2 million (the export facility of DKK 4.5 million plus the DKK 0.7 million increase of the working capital facility).</p>
      <p>The bank's first approval lapsed on 30 June 2026 because EIFO's commitment was not in place. On 10 September 2026 the bank renewed the approval for unchanged amounts with establishment on 1 November 2026, subject to EIFO's guarantee commitment by 31 October 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">amendment no. 1 to the application</span>).</p>
    </div>
  `,

  financing: `
    <table>
      <thead><tr><th>Financing plan</th><th style="text-align:right">DKK m</th><th style="text-align:right">%</th><th>Capital requirement</th><th style="text-align:right">DKK m</th></tr></thead>
      <tbody>
        <tr><td>Export facility, Nordjyske Bank (of which EIFO guarantee 80% = 3.6)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">4.5</span></td><td style="text-align:right;font-family:monospace">64.3%</td><td>Material purchases (carbon fibre/resin)</td><td style="text-align:right;font-family:monospace">2.8</td></tr>
        <tr><td>Nordjyske Bank, working capital facility (1.5 existing + 0.7 new)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">2.2</span></td><td style="text-align:right;font-family:monospace">31.4%</td><td>Work in progress</td><td style="text-align:right;font-family:monospace">2.4</td></tr>
        <tr><td>Own financing, free cash</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">0.3</span></td><td style="text-align:right;font-family:monospace">4.3%</td><td>Working capital until Q4 payment</td><td style="text-align:right;font-family:monospace">1.8</td></tr>
        <tr><td><span class="tpl-blank">[add row]</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">0.0</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">%</span></td><td><span class="tpl-blank">[capital requirement]</span></td><td style="text-align:right;font-family:monospace"><span class="tpl-blank">0.0</span></td></tr>
        <tr><td><strong>Total</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">7.0</td><td style="text-align:right;font-family:monospace;font-weight:600">100.0%</td><td><strong>Total</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">7.0</td></tr>
      </tbody>
    </table>
    <ul class="tpl-hints">
      <li>Assessment of whether the risk sharing is sufficiently balanced, considering EIFO's share of the financing, whether EIFO guarantees or contributes equity to the co-financing, collateral, repayment profile and whether EIFO is subordinated to other debt.</li>
      <li>Comments on the repayment profile, including arguments for an initial grace period.</li>
      <li>Any other comments on the financing structure.</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p><strong>Risk sharing:</strong> The EIFO guarantee covers 80% (DKK 3.6 million) of the export facility of DKK 4.5 million on a proportional (pari passu) basis, not first loss. The bank itself carries 20% (DKK 0.9 million) of the facility, the entire working capital facility of DKK 2.2 million and the existing term loan of DKK 1.8 million. EIFO ranks pari passu with the bank in the collateral and is not subordinated (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">application, section 1.1</span>). The bank's gross exposure becomes DKK 8.5 million with a net risk of DKK 4.9 million.</p>
      <p><strong>Repayment profile:</strong> The facility is revolving, drawn against documented material invoices and work in progress. Under the bank's renewed commitment the guarantee period runs from 1 November 2026 to 30 April 2029 (30 months), and the maximum drawing steps down from DKK 3.0 million in Q1 2027 to DKK 2.0 million from 30 June 2027 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">amendment to the application, item 2</span>). There is no initial grace period: the facility is repaid on a rolling basis by GE Vernova's T2 payments for the partial deliveries, and in the budget the drawing is DKK 0.5 million at the end of 2026, DKK 0.6 million at the end of 2027 and DKK 0.7 million at the end of 2028 (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">budget note 7</span>). The facility's main role is to carry a delayed payment from GE Vernova, cf. the sensitivity analysis in section 10.</p>
      <p><strong>Other comments:</strong> The application's own financing plan (section 1.3) splits the requirement as DKK 3.6 / 2.2 / 1.2 million and leaves out the bank's uncovered share of the facility of DKK 0.9 million; the table above follows the budget's plan, which reconciles to the capital requirement. The bank is asked to confirm the split, cf. Discrepancies in the source material in section 5. <span class="tpl-blank">[any supplementary comments]</span></p>
    </div>
  `,

  rating: `
    <table>
      <tbody>
        <tr><td style="width:42%">Objective (calculated) credit rating</td><td><strong>BB+</strong> <span style="color:var(--c-text-3); font-size:11px">(score 6.2/10)</span> (<span class="memo-cite" data-doc="Ratingberegning_2026-0184.pdf" data-page="s. 1">rating calculation, p. 1</span>)</td></tr>
        <tr><td>Recommended credit rating</td><td><strong>BB</strong> <span style="color:var(--c-text-3); font-size:11px">(override − 1 notch)</span> (<span class="memo-cite" data-doc="Ratingberegning_2026-0184.pdf" data-page="s. 2">rating calculation, p. 2</span>)</td></tr>
        <tr><td>Override(s) applied</td><td>Customer concentration: downgrade 1 notch</td></tr>
        <tr><td>Rationale for overrides</td><td>Top-3 customers account for <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Kunder">64% of revenue</span> in the first eight months of 2026, with GE Vernova alone at 38%. The objective model does not sufficiently capture the risk of losing a single primary customer, and a manual one-notch downgrade has therefore been applied. For comparison, Nordjyske Bank places the company in rating class 5 of 11 with a one-year PD of 1.4% (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">application, section 3.6</span>).</td></tr>
      </tbody>
    </table>
  `,

  legal: `
    <ul class="tpl-hints">
      <li>[Only used for lending]</li>
      <li>[Insert the assessment from Legal SME / International Regulation &amp; Relations]</li>
    </ul>
    <p><strong>Legal SME's assessment:</strong> <span class="tpl-blank">[insert the assessment, or state why Legal SME has not been involved]</span></p>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The following matters in the case documents should be included in Legal SME's assessment:</p>
      <ul>
        <li><strong>The framework agreement with GE Vernova</strong> is governed by Danish law with arbitration in Copenhagen (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§14">§14</span>). It contains cross-default on default under financing above DKK 1.0 million, on termination or non-renewal of a credit facility and on breach of financial ratio requirements (solvency min. 30%, debt/EBITDA max. 4.0), as well as a change-of-control clause if Anders Holding ApS' shareholding falls below 33.4% (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§11">§11.6 and §11.7</span>).</li>
        <li>Receivables under the agreement cannot be pledged without GE Vernova's written consent, and GE Vernova holds title to materials and work in progress financed by the prepayment (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§4">§4.7 and §4.10</span>). The bank gave its declaration on this on 21 September 2026, before the 30 September deadline, and these assets are excluded from the drawing basis (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">the amendment, item 7</span>). This affects the receivables pledge and the drawing basis for the facility.</li>
        <li>Anders Christensen's shareholder loan of DKK 0.5 million is not subordinated, and no subordination declaration exists (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">note 14</span>). The declaration is a condition for the first disbursement.</li>
        <li>In 2025 the company made an unlawful shareholder loan to the CEO in breach of section 210 of the Danish Companies Act (max. DKK 180k, repaid with interest on 12 November 2025). The auditor has referred to the matter in the audit report, and management may incur liability (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 14">audit report</span>). The register of shareholders wrongly describes the shareholder loan as a section 210 loan, cf. Discrepancies in the source material in section 5.</li>
        <li>The company guarantee from Nordhavn Holding ApS exists only as an unsigned draft without a corporate resolution (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S5">S5</span>).</li>
      </ul>
    </div>
  `,

  risk: `
    <table>
      <thead><tr><th style="width:38%">Key risk areas</th><th>Mitigation</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>Risk area 1: Customer concentration</strong><br/><span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Kunder">Top-3 customers = 64% of revenue</span> in the first eight months of 2026, GE Vernova alone 38%. GE Vernova accounts for <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Ordrebog">45.3% of the order book</span> for the next four quarters.</td>
          <td><em>Elaborate on the risk area / Analyse mitigating factors:</em><br/>The facility is in practice repaid by one customer's payments. GE Vernova has guaranteed off-take of the 62 blade sets (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="s. 1">framework agreement, item 1.6</span>), and the prepayment of USD 1,245,000 has been received. The company has qualified with two new customers with first deliveries in 2026 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>).<br/><strong>This is mitigated by</strong> a rating override (-1 notch) and quarterly order book and receivables reporting (reporting requirements R4 and R5).<br/><em>Assessment: Not fully mitigated, maintained as an override.</em></td>
        </tr>
        <tr>
          <td><strong>Risk area 2: Raw material prices</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">Carbon fibre +22% year on year; fixed-price agreements cover approx. 60%</span> of expected consumption for the next 12 months.</td>
          <td>The remaining approx. 40% is bought at spot prices (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Forudsætninger">budget assumptions</span>). The GE Vernova agreement only adjusts the carbon fibre price beyond a dead band of ±10 percentage points, and the excess increase on the unhedged share is split 50/50 (75/25 above 15 percentage points) (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§7">§7.4</span>); the first adjustment as of 1 July 2026 gave USD 28,416. A further 10% increase on the unhedged share costs approx. DKK 380k in gross profit (note 18). The annual report states index clauses in three of the four largest customer contracts, while the notes to the interim figures state that Vestas and Siemens Gamesa have no such clause; this must be clarified.<br/><em>Assessment: Partly mitigated.</em></td>
        </tr>
        <tr>
          <td><strong>Risk area 3: Currency exposure</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">41% of revenue is invoiced in USD/EUR</span>, and there is no formal hedging policy.</td>
          <td>The Block Island contract is settled in USD, and the buyer carries no currency risk. No forward contracts had been entered into as of 31 August 2026 (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Noter">interim figures, note 5</span>). A 10% fall in USD reduces the proceeds of the 2026 portion by approx. DKK 0.92 million, equal to approx. 80% of the bottom line for the year (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 2">application, section 2.2</span>). Under the bank's amendment at least 70% of the remaining contract value must be hedged by 1 December 2026, and the board must adopt a currency policy by 30 November 2026 (covenant C6); the board considers the policy on 19 November 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">the amendment, item 3</span>).<br/><em>Assessment: Not mitigated until the hedging is documented (condition B4).</em></td>
        </tr>
        <tr>
          <td><strong>Risk area 4: Delivery and liquidity</strong><br/><span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§3">Partial delivery DL-2 with a last on-time delivery date of Friday 25 September 2026</span> was the contract's critical milestone (M3) and was delivered on 22 September 2026. Liquidity bottoms out at DKK 0.93 million at the end of October 2026 with the working capital facility fully drawn.</td>
          <td>Delay costs liquidated damages of 0.5% per commenced week (max. 5%), and a delay of M3 of more than 10 weeks entitles the buyer to terminate. The production equipment is process-locked and cannot be moved without the buyer's approval. DL-1 was delivered on time on 27 May 2026, and DL-2 was delivered DAP Cherbourg on 22 September 2026; incoming inspection is completed by 6 October 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">the amendment, item 6</span>). Running in the new mould F-7 in Q1 2026 meant that line L-2 stood idle for a total of eleven working days (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Noter">interim figures, note 2</span>). Liquidity is tight until the facility is established on 1 November: the working capital facility is fully drawn at the end of October, and there is no undrawn headroom (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">liquidity forecast</span>). If GE Vernova's payment for DL-2 (due 24 November 2026) slips to January 2027, December 2026 ends at DKK -1.37 million before drawings on the facility; with the facility the delay can be absorbed.<br/><em>Assessment: Partly mitigated. The delivery risk on DL-2 has fallen away; liquidity depends on the facility being established on 1 November 2026.</em></td>
        </tr>
        <tr>
          <td><strong>Risk area 5: Governance and shareholder loan</strong><br/><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 14">The auditor has included an other-matter paragraph on an unlawful shareholder loan to the CEO (section 210 of the Danish Companies Act) and emphasised that the shareholder loan of DKK 500k is not subordinated</span>.</td>
          <td>The unlawful loan (max. DKK 180k) was repaid with statutory interest on 12 November 2025, and a written procedure for expenses and intercompany balances with management was introduced from 1 December 2025 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">note 14</span>). Management may incur liability. The shareholder loan from Anders Christensen personally ranks with ordinary unsecured creditors until a subordination declaration is in place (condition B2), and covenant C4 prohibits payments on the loan during the guarantee period.<br/><em>Assessment: Material risk. Mitigated if B2 is fulfilled before the first disbursement and the board follows up on the procedure.</em></td>
        </tr>
        <tr>
          <td><strong>Risk area 6: Value of the collateral</strong><br/>The chattel mortgage has a <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S1">realisable value in a quick sale of DKK 2.1 million</span>, the floating charge covers receivables only, and the real encumbrance of the property is unclear.</td>
          <td>The bank's ranking overview does not include the mortgage loan secured on Havnegade 42 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">note 10</span>). With the loan ranking first, total encumbrances are approx. DKK 6.0 million, approx. 147% of the public valuation of DKK 4.1 million, and the owner's mortgage of DKK 2.5 million has no real cover. Materials and work in progress financed by GE Vernova's prepayment belong to the buyer and are excluded from the drawing basis (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§4">§4.7</span>). The company guarantee is an unsigned draft (B1).<br/><em>Assessment: Partly mitigated. A land register certificate and a signed company guarantee must be in place before the first disbursement.</em></td>
        </tr>
      </tbody>
    </table>
    <p class="tpl-note">Add or delete rows as needed.</p>

    <h3 class="tpl-subhead">Discrepancies in the source material</h3>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The source documents have been checked against each other. The following matters differ between the sources and are handled as follows in the memo:</p>
      <table>
        <thead><tr><th style="width:34%">Matter</th><th>Handling</th></tr></thead>
        <tbody>
          <tr><td><strong>The shareholder loan and section 210.</strong> The <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">register of shareholders</span> calls the DKK 0.5 million loan from Anders Christensen an unlawful shareholder loan under section 210 with 12 months' notice.</td><td>According to <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">note 14</span> and the auditor's report it is a loan to the company with 6 months' notice, effective no earlier than 30 June 2027. The section 210 matter was a separate balance of max. DKK 180k, repaid on 12 November 2025. The memo follows note 14; the keeper of the register is asked to correct the extract. <em>Open.</em></td></tr>
          <tr><td><strong>The mortgage loan on Havnegade 42.</strong> <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">Note 10</span> and the interim figures show a mortgage loan secured on the property (outstanding approx. DKK 1.9 million), which the ranking overview in S2 omits (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S2">total encumbrances of DKK 4,100,000</span>).</td><td>A land register certificate is obtained before disbursement. Until then the owner's mortgage of DKK 2.5 million is not counted as real cover (encumbrances approx. 147% of the valuation). <em>Open.</em></td></tr>
          <tr><td><strong>The liquidity low point.</strong> The bank's application is based on budget version 2.2 (May) with a low point of DKK 0.62 million in November and DKK 1.92 million available.</td><td>The memo uses budget version 3, reconciled to the interim figures at 31 August: low point DKK 0.93 million at the end of October with the working capital facility fully drawn and DKK 0.93 million available (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">comment 1</span>). <em>Reconciled.</em></td></tr>
          <tr><td><strong>Equity 2024.</strong> Equity rose from DKK 3.5 million to DKK 4.8 million, while the profit for the year was DKK 0.7 million.</td><td>The difference is a directed cash capital increase of DKK 0.6 million on 27 June 2024 (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">note 11</span>): 3.5 + 0.7 + 0.6 = 4.8. <em>Reconciled.</em></td></tr>
          <tr><td><strong>Phasing of Block Island.</strong> The <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">budget</span> has DKK 5.6 million in Q3 and DKK 6.2 million in Q4 2026, while the delivery plan has DL-1, DL-2 and DL-3 in 2026 at USD <span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§3">780,400, 1,036,800 and 648,000</span>, calculated at approx. DKK 16.9 million at a rate of 6.85.</td><td>The company is asked to reconcile the budget with the delivery plan. The memo assesses 2026 on actual figures and the order book; 2027 relies more on the option for 18 blade sets and new orders. <em>Open.</em></td></tr>
          <tr><td><strong>The financing plan.</strong> The <span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">application</span> splits the requirement as DKK 3.6 / 2.2 / 1.2 million; the <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">budget</span> as DKK 4.5 / 2.2 / 0.3 million.</td><td>The memo follows the budget's plan, which reconciles to the capital requirement of DKK 7.0 million and includes the bank's uncovered share. The bank is asked to confirm. <em>Open.</em></td></tr>
          <tr><td><strong>Index clauses.</strong> <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">Note 18</span> mentions clauses in three of the four largest customer contracts; the interim figures say that Vestas and Siemens Gamesa have none.</td><td>To be clarified with the company. Only the adjustment in the GE Vernova agreement is counted as mitigation in risk area 2. <em>Open.</em></td></tr>
        </tbody>
      </table>
    </div>
  `,

  conclusion: `
    <p><strong>Conclusion, overall risk assessment: <span class="tpl-risk mid">Medium/High</span></strong></p>

    <p><strong>Recommended for approval on the basis of:</strong></p>
    <ul class="tpl-hints">
      <li>Assessment of the company's economic viability, including whether there is debt service capacity with a satisfactory margin?</li>
      <li>How does the financing support EIFO's strategy?</li>
      <li>Are there documented management competencies that make it probable that the activity can be carried out and is profitable?</li>
      <li>Are the necessary and relevant special conditions included? [only applicable to EIFO guarantees]</li>
      <li>Conclusion on ESG, appendix <span class="tpl-blank">2</span></li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <ul>
        <li><strong>Economic viability:</strong> Net revenue has risen to <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">DKK 41.1 million in 2025</span>, but earnings capacity is thin: the EBITDA margin is <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5.8%</span> and unchanged from 2024. Debt/EBITDA of <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3.3×</span> is high for a company of this size; the 2026 budget expects 3.0. Debt service capacity is sufficient in the base case but sensitive to the timing of GE Vernova's payment and the USD rate (section 10).</li>
        <li><strong>EIFO strategy:</strong> Aligned with EIFO's export focus and green transition strategy: the facility finances exports of components for a US offshore wind project.</li>
        <li><strong>Management competencies:</strong> The co-founders Anders Christensen (CEO) and Maria Lindbjerg (CTO) have run the company since 2014 through more than a doubling of revenue. The board has an independent chairman who has worked in the wind turbine industry for 22 years, and two investor-appointed members (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">management overview</span>). The auditor is Nordjysk Revision P/S (state-authorised). Management's education and previous employment are not documented in the material.</li>
        <li><strong>Special conditions:</strong> Subordination declaration from Anders Christensen on the shareholder loan, signed company guarantee from Nordhavn Holding ApS, hedging of at least 70% of the remaining contract value and a written currency policy, and quarterly covenant and order book reporting (see Appendix 1).</li>
        <li><strong>ESG:</strong> Low risk, cf. Appendix 2. The company supplies components for renewable energy.</li>
      </ul>
    </div>

    <p><strong>And despite:</strong></p>
    <ul class="tpl-hints">
      <li>Material risks that cannot be mitigated to an acceptable level</li>
      <li>Failure to meet material factors that EIFO weights</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <ul>
        <li>High customer concentration (top-3 = 64%, GE Vernova 38%), which cannot be fully mitigated; addressed via rating override and reporting requirements.</li>
        <li>The auditor's other-matter paragraph on an unlawful shareholder loan to the CEO (section 210 of the Danish Companies Act) and emphasis of the non-subordinated <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">shareholder loan of DKK 0.5 million</span> from Anders Christensen. A subordination declaration is a condition for the first disbursement.</li>
        <li>Unhedged USD exposure: there are no forward contracts, and a 10% fall in the rate equals approx. 80% of the expected profit for the year.</li>
        <li>The collateral is not in place: the company guarantee is an unsigned draft, addenda on EIFO's pari passu ranking in the security do not exist, and the bank's ranking overview for the property omits the mortgage loan (Appendix 1).</li>
        <li>Tight liquidity until establishment: liquidity bottoms out at DKK 0.93 million at the end of October 2026 with the working capital facility fully drawn, approx. DKK 1.0 million less available than in the bank's application budget. The bank has renewed its commitment, subject to EIFO's commitment by 31 October 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">amendment to the application</span>).</li>
        <li>Unresolved discrepancies in the source material on the property security, the register's description of the shareholder loan and the budget's phasing of Block Island (section 5).</li>
      </ul>
    </div>
  `,

  ownership: `
    <h3 class="tpl-subhead">Ownership structure</h3>
    <em class="tpl-hint">Analyse the most significant factors, including [where relevant]:</em>
    <ul class="tpl-hints">
      <li>Who owns the companies and with what ownership share? Is there a clear ownership structure?</li>
      <li>Is the company owned by a foundation/association, or is the ownership significantly fragmented?</li>
      <li>Bankruptcy history of the owners. If so, focus on the owners' role and conduct and which creditors suffered material losses. What lessons were learned, and how are they incorporated into the company's business model, processes and governance.</li>
      <li>The owners' and guarantors' financial circumstances and ability to make further capital injections and/or honour guarantee obligations, as well as capital-raising strategy.</li>
      <li>Material activity in sister/subsidiary companies where it deviates from the borrower.</li>
      <li>Plans for generational succession, including any successors.</li>
    </ul>
    <p class="tpl-note">For complex group structures, a group chart/cap table can be attached as an appendix.</p>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The company is owned by <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 1">Anders Holding ApS (50.7%), Erhvervsfonden (23.6%), Maria Lindbjerg (15.6%) and Industrifonden A/S (10.1%)</span>. Anders Holding ApS is wholly owned by Anders Christensen, who is the only registered beneficial owner. Employee warrants equal to 5.0% on full exercise have been issued and appear only in the register of shareholders. The ownership is not fragmented, but under the shareholders' agreement the two institutional investors hold veto rights over, among other things, new debt, pledges and related-party transactions. On 30 June 2026 Erhvervsfonden consented to new financing of up to DKK 7.5 million and related pledges, but not to guarantees (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 4">shareholders' agreement</span>). The bank has found no credit bureau (RKI) registrations on the company, Anders Holding ApS, Nordhavn Holding ApS or Anders Christensen (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">application, section 3.2</span>).</p>
      <p>Anders Christensen has personally granted the company a <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14">shareholder loan of DKK 0.5 million (5.0% p.a., interest-only with no fixed redemption date; can be terminated with effect from 30 June 2027 at the earliest)</span>. The loan is unsecured and not subordinated, and no subordination declaration exists. Anders Christensen has provided a <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S4">personal joint and several guarantee of max. DKK 1.0 million</span>, signed on 15 January 2026. There is no updated statement of assets, so the real value of the guarantee has not been verified.</p>
      <p>The company has no subsidiaries. Anders Christensen also controls Nordhavn Holding ApS (owned 66.7% by Anders Holding ApS and 33.3% by Maria Lindbjerg), which owns the sister company Nordhavn Production ApS (finishing and packing, 6 employees). Trading between them is limited and on market terms (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">register of shareholders, group overview</span>). Anders Christensen was born in 1979 (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">management overview</span>), and a generational change is not imminent. The shareholders' agreement requires him and Maria Lindbjerg to work full time in the company (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 4">shareholders' agreement, item 11</span>). If either of them ceases to be actively involved in day-to-day management without an approved successor, the buyer can demand renegotiation of the framework agreement (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§11">§11.7</span>).</p>
    </div>

    <h3 class="tpl-subhead">Management</h3>
    <em class="tpl-hint">Analyse the executive management/key employees with respect to:</em>
    <ul class="tpl-hints">
      <li>Function in the company plus education, management and industry experience and competencies, including whether competencies match the company's needs</li>
      <li>Any incentive schemes</li>
      <li>Risk appetite. Is management very cautious, risk-seeking, or do they take a balanced risk?</li>
      <li>Finance function, including competencies and quality of reporting</li>
      <li>References, bankruptcy history</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <ul>
        <li><strong>CEO/co-founder:</strong> Anders Christensen, CEO since the company was founded in 2014, responsible for commercial management, the customer relationships with GE Vernova, Vestas and Siemens Gamesa, and financing (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">management overview</span>). He graduated as an MSc in materials engineering from Aalborg University in 2004 and worked at LM Wind Power from 2004 to 2013, most recently as production manager for blade components (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">management overview</span>).</li>
        <li><strong>CTO/co-founder:</strong> Maria Lindbjerg, CTO since 2019, responsible for process development, choice of materials and quality management. She is not registered as a director in the Central Business Register and holds a power of procuration of up to DKK 0.5 million per transaction.</li>
        <li><strong>Finance function:</strong> Head of finance Susanne Pedersen (joined on 1 June 2026) and controller Thomas Riis prepare the budget, the monthly liquidity forecast and the interim figures. Earlier versions of the budget, including version 2.2 behind the bank's application, were prepared by the former head of finance Pia Nørgaard (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Versionslog">the budget's version log</span>). The change in the middle of the financing case and the discrepancies found in the budget call for quarterly follow-up on the reporting.</li>
        <li><strong>Incentive schemes:</strong> Warrant programme NC-W2022 for 14 employees and key employees (5.0% on full exercise) and a bonus to the executive management of DKK 130k in 2025.</li>
        <li><strong>Risk appetite:</strong> Management has taken on the company's largest order to date without currency hedging and has financed the material purchases on the working capital facility, which is fully drawn at the end of October 2026. Assessed as moderately risk-seeking.</li>
        <li><strong>References:</strong> The bank describes management as credible in its reporting and has had no payment remarks since 2017 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">application, section 3</span>). No bankruptcy history has been reported.</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">Board of directors</h3>
    <em class="tpl-hint">Analyse the most significant factors regarding the board/advisory board, e.g.:</em>
    <ul class="tpl-hints">
      <li>Who sits on the board, with a brief history of business experience?</li>
      <li>Particular competencies the member contributes</li>
      <li>Relationship to the owners, including whether the member represents an owner/investor?</li>
      <li>Is the board professional and does it cover the company's needs?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The board has four members (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 2">company details</span>): Erik Sandberg (chairman since 2020, independent, 22 years as production director and COO in the wind industry), Anders Christensen (CEO and indirect majority owner), Lene Mortensen (appointed by Erhvervsfonden, investment director, MSc in Business Economics and Auditing) and Kim Vestergaard (appointed by Industrifonden A/S, partner, former CFO of two industrial subcontractor groups).</p>
      <p>The board is considered professionally composed with a real counterweight to the executive management. It held 6 ordinary meetings and 1 extraordinary meeting in 2025. No audit committee has been set up, and the fifth board seat has been vacant since April 2025 (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 3">management overview</span>). <span class="tpl-blank">[optional elaboration on the board's work]</span></p>
    </div>

    <h3 class="tpl-subhead">Advisors/network</h3>
    <p class="tpl-note">Only stated if these are material and there is no professional board.</p>
    <em class="tpl-hint">Advisors/network close to the company plus a brief description of competencies and the real value of the sparring.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>Auditor: <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 2">Nordjysk Revision P/S</span>, state-authorised public accountant Henrik Bak, auditor since the 2017 financial year. Lawyer: Advokatfirmaet Hjulmand, Aalborg. The register of shareholders is kept by Advokatfirmaet Vendia. The advisors' role in strategic decisions is not covered in the material.</p>
    </div>

    <p><strong>Overall conclusion on ownership, management, board and advisors, risk assessment: <span class="tpl-risk mid">Medium</span></strong></p>
    <em class="tpl-hint">Brief conclusion on management strength, including whether the owners actively use the board and advisors, and a conclusion on whether it is adequately composed to future-proof the company.</em>
    <p>Professionally composed board with an independent chairman and investor-appointed members, and management has delivered strong growth. Governance pulls down: in 2025 the company made an unlawful shareholder loan to the CEO, which the auditor has referred to in the audit report, and the shareholder loan is not subordinated. The unlawful loan has been repaid and a new procedure introduced, which the board should follow up on.</p>
  `,

  product: `
    <h3 class="tpl-subhead">Products, risk assessment: <span class="tpl-risk lav">Low</span></h3>
    <em class="tpl-hint">Analyse the product risk, e.g.:</em>
    <ul class="tpl-hints">
      <li>Which products/product segments does the company operate with?</li>
      <li>How is the company's product diversification assessed / does the company spread across products and/or markets?</li>
      <li>Where are the products positioned in the value chain?</li>
      <li>Are the products based on low or high technology?</li>
      <li>Is production to stock or to order?</li>
      <li>Which group company owns any patent and licence rights, and are they covered by EIFO's charge?</li>
    </ul>
    <p class="tpl-note">[delete items that are not relevant]</p>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The company manufactures structural composite components for wind turbine blades: spar caps and pultruded carbon fibre laminates, root modules and root inserts, leading edges and closing profiles, and service, repair and spare parts. Revenue in 2025 was split across the four areas with <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6">DKK 22.6, 10.3, 5.3 and 2.9 million</span>, calculated at 55%, 25%, 13% and 7% of revenue. All revenue comes from the wind industry; the marine and defence industries are a diversification target. The products are technologically demanding with substantial process knowledge, and production is to order. The company owns the production tooling for most programmes, while the project tooling for Block Island passes to GE Vernova. Capitalised development projects of DKK 0.6 million (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">balance sheet</span>) are owned by the company but are not covered by the floating charge, which covers receivables only (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S3">S3</span>).</p>
    </div>

    <h3 class="tpl-subhead">Business model, risk assessment: <span class="tpl-risk lav">Low</span></h3>
    <em class="tpl-hint">Analyse the company's current business model, including value proposition.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>Contract manufacturing (B2B) for OEM customers in the wind industry under a build-to-print and co-engineering model, partly on framework agreements with rolling call-offs over 12 to 36 months and partly on project orders (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">management review</span>). Prices are set from calculated material consumption and cycle time with index adjustment on selected raw materials. The company competes on delivery time, technical documentation and geographical proximity to the customers' blade factories. The EBITDA margin of 5.8% is below the median of 6.4% for European Tier-2 composite suppliers (WindEurope).</p>
    </div>

    <h3 class="tpl-subhead">Strategy, risk assessment: <span class="tpl-risk mid">Medium</span></h3>
    <em class="tpl-hint">Analyse the company's forward-looking strategy, including:</em>
    <ul class="tpl-hints">
      <li>Market strategy, including geographic concentration and dependence on single markets</li>
      <li>Product and development strategy</li>
      <li>Distribution strategy</li>
    </ul>
    <em class="tpl-hint">Focus on new initiatives relative to the current set-up, and the reason for the changed strategy.</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <ul>
        <li><strong>Market strategy:</strong> The customer base is to be broadened, including towards the marine and defence industries; the company has qualified with two new customers with first deliveries in 2026 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>). The Block Island reference is assumed to give access to more offshore projects with GE Vernova, and a bid on Sunrise Wind (DKK 6-8 million) awaits clarification in Q1 2027 (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Ordrebog">order book</span>). Revenue goes to Denmark, the rest of the EU and the US.</li>
        <li><strong>Product and development strategy:</strong> Larger blades and structural carbon fibre components. The development project NC-Spar 92 (spar caps for 92-metre blades) went into operation in 2025, and infusion line IL-2 (DKK 1.45 million) was commissioned on 1 September 2026 as a result of the Block Island order.</li>
        <li><strong>Distribution strategy:</strong> Direct sales to OEMs, no distributor tier.</li>
      </ul>
      <p>The strategy is driven by the offshore wind build-out and larger blades, which increase material consumption per MW.</p>
    </div>
  `,

  market: `
    <p class="tpl-note">[For all items in this section: if the risk is assessed as "Low", only a few lines of justification are given. Be mindful of consistency with the qualitative answers in the rating]</p>

    <h3 class="tpl-subhead">Market, risk assessment: <span class="tpl-risk mid">Medium</span></h3>
    <em class="tpl-hint">Brief analysis of the risk in the markets the company operates in, e.g.:</em>
    <ul class="tpl-hints">
      <li>Market development and trends, cyclicality and substitution risk</li>
      <li>Market concentration</li>
      <li>Market drivers</li>
      <li>Barriers to entry</li>
      <li>Digital trends in the market</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The value of the European market for wind composite components is expected to grow from EUR 4.9 billion in 2025 to EUR 6.7 billion in 2030, equal to 6.4% p.a.; volume grew 6.8% in 2025, driven by offshore wind and larger rotors. Demand follows the OEMs' order intake and is therefore moderately cyclical, but structurally growing. Barriers to entry are high, as OEM qualification typically takes 9 to 15 months (p. 22). The largest structural risk is Asian overcapacity, with blade sets offered 28-35% below European prices (p. 24).</p>
    </div>

    <h3 class="tpl-subhead">Competition, risk assessment: <span class="tpl-risk mid">Medium</span></h3>
    <em class="tpl-hint">Brief analysis of competitors and how the company's value proposition differentiates it from them, including:</em>
    <ul class="tpl-hints">
      <li>Main competitors</li>
      <li>Competitive parameters and differentiation versus competitors / competitive advantages</li>
      <li>Any technology differences</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The OEM tier is concentrated: the four largest OEMs accounted for 79% of newly installed capacity in Europe in 2025, and a growing share of the large blades is made in the OEMs' own factories. Nordhavn competes with larger European composite suppliers and Asian manufacturers on delivery time, technical documentation and proximity to the customers' factories (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">management review</span>). The number of independent Tier-2 suppliers in Europe has fallen from 176 in 2020 to 154 in 2025. The closest competitors in spar caps and root modules are Jutland Composites A/S in Esbjerg, Baltic Blade Parts in Szczecin and Anatolia Kompozit in Izmir (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">management review</span>).</p>
      <table>
        <thead><tr><th>Key figures 2025</th><th style="text-align:right">Nordhavn Composite</th><th style="text-align:right">Tier-2 suppliers (WindEurope)</th></tr></thead>
        <tbody>
          <tr><td>EBITDA margin (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5.8%</span></td><td style="text-align:right;font-family:monospace">6.4%</td></tr>
          <tr><td>Top-3 customers' share of revenue (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">56%</span></td><td style="text-align:right;font-family:monospace">61%</td></tr>
          <tr><td>Materials in % of revenue (weighted average)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">55.0%</span></td><td style="text-align:right;font-family:monospace">55%</td></tr>
          <tr><td>Debtor days (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">23</span></td><td style="text-align:right;font-family:monospace">67</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="tpl-subhead">Customers, risk assessment: <span class="tpl-risk hoj">High</span></h3>
    <em class="tpl-hint">Brief analysis of customers, including:</em>
    <ul class="tpl-hints">
      <li>Who are the company's most significant customers/the 3 largest customers or customers accounting for more than 20% of revenue?</li>
      <li>Is there a good spread of customers, or is there dependence on individual customers, and is the trend towards greater or lesser dependence?</li>
      <li>What influence do customers have over the company, including who sets price and terms, is customer loyalty high/low, is it easy and cheap or costly for customers to substitute the company's products?</li>
      <li>Are there any particular contractual matters?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>Top-3 customers = <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Kunder">64% of revenue in the first eight months of 2026</span>: GE Vernova (38.0%), Vestas (18.0%) and Siemens Gamesa (8.0%). In 2025 the top-3 share was 56%. Concentration is rising because of Block Island: without the order GE Vernova would have been at approx. 20%, in line with 2025, and GE Vernova accounts for 45.3% of the order book for the next four quarters.</p>
      <p>The customers are large OEMs with a strong negotiating position, and the industry typically sees annual price reduction demands of 2-4% (WindEurope). Switching costs are high because a qualified composite programme is costly to move, and the framework agreements run for 12 to 36 months (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>). Particular contractual matters: the Block Island agreement has liquidated damages for delay, cross-default and a change-of-control clause, cf. sections 4 and 5.</p>
    </div>

    <h3 class="tpl-subhead">Suppliers, risk assessment: <span class="tpl-risk mid">Medium</span></h3>
    <em class="tpl-hint">Brief analysis of suppliers, including:</em>
    <ul class="tpl-hints">
      <li>Who are the company's most significant suppliers?</li>
      <li>Is there dependence on individual suppliers, critical components, country risk etc.? If so, what is the company's action plan for securing deliveries from an alternative supplier?</li>
      <li>Is it possible to switch supplier (notice periods, switching costs and named alternative suppliers)?</li>
      <li>What is the relative bargaining power between the company and the supplier on price and other terms?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The most significant suppliers are Toray Europe (carbon fibre) and Olin (epoxy resin) (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">budget note 1</span>). Approx. 60% of consumption is covered by fixed-price agreements, and the fixed-price agreement with Toray Europe expires on 31 December 2027. The credit line with Toray Europe is fully used, and the suppliers require prepayment on the latest orders. The framework agreement with GE Vernova requires at least two qualified sources for each structural material item and a safety stock of 8 weeks' carbon fibre consumption (<span class="memo-cite" data-doc="GE_Vernova_rammekontrakt.pdf" data-page="§2">§2.5</span>); switching fibre supplier requires new process approval at the OEM, typically 4-7 months. Bargaining power towards the carbon fibre suppliers is assessed as low.</p>
    </div>
  `,

  financial: `
    <h3 class="tpl-subhead">Accounting formalities</h3>
    <em class="tpl-hint">Form of audit: accounts audited or extended review? Auditor type, e.g. state-authorised or registered auditor. Are there qualifications / audit remarks? Who prepared the interim accounts, budget material, sensitivity analysis and any group consolidation?</em>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 14">Annual report 2025 is audited by Nordjysk Revision P/S (state-authorised public accountant Henrik Bak) with an unqualified opinion, but with supplementary information on an unlawful shareholder loan to the CEO (section 210 of the Danish Companies Act) and an emphasis of matter that the shareholder loan of DKK 500k is not subordinated</span>. The audit reports for 2023 and 2024 are clean (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 3">application, section 3.3</span>). The interim figures for January-August 2026 are an extract from e-conomic of 14 September 2026 without audit or review. Budget 2026-28 (version 3 of 11 September 2026) was prepared by the company's head of finance and controller and has not been reviewed by the auditor; the sheet with sensitivity calculations has not been submitted. Group consolidation: not relevant, as <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">Nordhavn Composite A/S has no subsidiaries</span> according to the group overview in the register of shareholders.</p>
    </div>

    <h3 class="tpl-subhead">Income statement</h3>
    <p><strong>History, annual accounts 12-2025</strong></p>
    <ul class="tpl-hints">
      <li>Trend and explanations of material developments in historical figures.</li>
      <li>The annual accounts are compared with the budget for the year and material budget variances are explained.</li>
      <li>Extraordinary items?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <table>
        <thead><tr><th>DKK m</th><th style="text-align:right">2023</th><th style="text-align:right">2024</th><th style="text-align:right">2025</th></tr></thead>
        <tbody>
          <tr><td>Revenue</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2023">28.0</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2024">32.8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41.1</span></td></tr>
          <tr><td>Gross profit</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2023">12.8</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2024">15.2</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2025">18.5</span></td></tr>
          <tr><td>EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6" data-line="EBITDA" data-col="2023">1.3</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6" data-line="EBITDA" data-col="2024">1.9</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="EBITDA" data-col="2025">2.4</span></td></tr>
          <tr><td>Equity</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2023">3.5</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2024">4.8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2025">6.2</span></td></tr>
        </tbody>
      </table>
      <p>Trend: net revenue has grown 47% in two years, but earnings are not keeping pace. The gross margin fell from 46.3% in 2024 to 45.0% in 2025 due to rising carbon fibre and resin prices, and the EBITDA margin is flat at 5.8% in both 2024 and 2025. Growth in 2025 came from the full-year effect of the root module programme for Vestas, higher sales to Siemens Gamesa and new customers, while deliveries to GE Vernova fell (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">management review</span>). The result is within management's announced expectations (revenue DKK 39-42 million, EBITDA DKK 2.2-2.6 million). No extraordinary items. Equity rose in 2024 from DKK 3.5 million to DKK 4.8 million with the profit for the year of DKK 0.7 million and a directed cash capital increase of DKK 0.6 million (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">annual report 2024, note 11</span>), and in 2025 to DKK 6.2 million with a profit of DKK 1.0 million and a capital increase of DKK 0.4 million.</p>
    </div>

    <p><strong>Budget 12-2026</strong></p>
    <ul class="tpl-hints">
      <li>State the most significant budget assumptions</li>
      <li>Analyse the realism of significant jumps in revenue, gross margin and EBITDA margin etc., e.g. order book and pipeline.</li>
      <li>Has a realistic bridge been demonstrated between historical operating performance and expected future operating performance?</li>
      <li>Development in capacity costs?</li>
      <li>Do depreciation charges match the asset's useful life?</li>
      <li>Any comparison with industry figures</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>Budget 2026: net revenue <strong>DKK 44.4 million</strong> (+8%) and EBITDA DKK 2.7 million (margin 6.1%) (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">income statement sheet</span>). Driver: the GE Vernova framework agreement with DKK 11.8 million recognised in 2026. Bridge: realised revenue of DKK 29.1 million in January-August (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat">interim figures</span>) plus an order book for delivery in September of DKK 9.4 million and in the fourth quarter of DKK 10.5 million (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Ordrebog">order book</span>) gives a calculated DKK 48.9 million, approx. 10% above the full-year budget. The difference arises because the budget phases Block Island at DKK 5.6 million in Q3 and DKK 6.2 million in Q4, while the delivery plan has DL-2 in September and DL-3 in December (section 5). The 2026 budget therefore looks conservative, while 2027 relies more on the option for 18 blade sets and new orders. Staff costs rise 8% to DKK 14.6 million (an average of 88 employees against 84). Depreciation follows useful lives of 8-10 years for production plant and 4-6 years for moulds and tools (note 7 of the annual report). Comparison with industry figures: the EBITDA margin of 6.1% is slightly below the median of 6.4% for European Tier-2 composite suppliers and at the lower end of the typical 5-9% range (WindEurope), leaving a limited buffer in case of price pressure or delays.</p>
    </div>

    <p><strong>Interim accounts January-August 2026 compared with budget</strong></p>
    <ul class="tpl-hints">
      <li>Explain material variances. Is it realistic that the annual budget will be met? If not, what result is estimated for the year?</li>
      <li>Have depreciation charges been recognised?</li>
      <li>Have accruals been made?</li>
      <li>Requirement for the remainder of the financial year to meet the budget ("Need-to-Meet")</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>January-August 2026: net revenue DKK 29.1 million against the board-approved budget of DKK 30.1 million and EBITDA DKK 1.68 million against DKK 1.97 million (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat">income statement sheet</span>). Revenue was DKK <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat" data-line="Nettoomsætning" data-col="Q1 2026">10.60</span> million in Q1, DKK <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat" data-line="Nettoomsætning" data-col="Q2 2026">11.10</span> million in Q2 and DKK <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Resultat" data-line="Nettoomsætning" data-col="Jul-aug 2026">7.38</span> million in July-August; Q3 has not yet closed. The shortfall is mainly due to running in a new mould in Q1 (a one-off effect) and two customer orders totalling DKK 0.5 million that were postponed to Q4. The EBITDA margin has improved from 5.1% in Q1 to 6.3% in Q2 and is 6.0% in July-August, when July is affected by holidays and a maintenance shutdown. Depreciation has been recorded; no tax has been provided, and work in progress is valued without profit. Budget version 3 of 11 September 2026 keeps the full year at revenue of DKK 44.4 million and EBITDA of DKK 2.7 million. Need-to-Meet: DKK 15.3 million in revenue and DKK 1.02 million in EBITDA in September-December, while the order book for delivery in the period is DKK 19.9 million.</p>
    </div>

    <h3 class="tpl-subhead">Balance sheet</h3>
    <p><strong>Latest annual accounts</strong></p>
    <ul class="tpl-hints">
      <li>Is the valuation of the assets realistic?</li>
      <li>Material intangible assets, buildings, inventories, work in progress and receivables</li>
      <li>Recognition method, depreciation method</li>
      <li>How is work in progress recognised, gross/net, incl. proportional profit?</li>
      <li>Is there a good spread and credit quality in trade receivables?</li>
      <li>Debt structure: Are material fixed assets financed with long-term debt? Current ratio?</li>
      <li>Material intercompany balances</li>
      <li>Material contingent liabilities?</li>
      <li>Is debt gearing (net interest-bearing debt/EBITDA) satisfactory relative to the industry?</li>
      <li>Solvency ratio with and without subordinated loans (if subordinated capital is negative, it must be addressed)?</li>
      <li>Group solvency where relevant.</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The assets are considered realistically valued. Revenue is recognised on delivery and transfer of risk, and no revenue is recognised under the percentage-of-completion method (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6">note 1</span>). According to the interim figures, work in progress is <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Balance">valued at costs incurred without profit</span>. Trade receivables of DKK 2.55 million are concentrated, as the three largest customers account for 78% at the balance sheet date, but the counterparties are large, listed or state-backed industrial groups, and debtor days are 23 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">note 8</span>). The property is financed with a 20-year mortgage loan, the machinery with term loans and leasing (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">note 10</span>); the mortgage loan does not appear in the bank's ranking overview, cf. section 5. Current ratio 250%. Solvency 44.3%; the shareholder loan of DKK 0.5 million is not subordinated and cannot be counted as subordinated capital until a subordination declaration is in place. Total debt/EBITDA 3.3 and net interest-bearing debt/EBITDA 1.5 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">key figures</span>). Contingent liabilities: lease obligations of DKK 1.98 million, customary product warranties and a performance bond to GE Vernova of USD 207,500. Intercompany balances: the unlawful loan to the CEO has been repaid, and there was no balance with management at the end of 2025.</p>
    </div>

    <p><strong>Budget (balance sheet)</strong></p>
    <ul class="tpl-hints">
      <li>Explain and analyse the material changes relative to the latest annual accounts</li>
      <li>Is the debt gearing (net interest-bearing debt/EBITDA) satisfactory?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>Budget at the end of 2026: equity DKK 7.35 million, solvency <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Balance" data-line="Soliditetsgrad %" data-col="2026E">47.3%</span> and total debt/EBITDA <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Balance" data-line="Gæld / EBITDA" data-col="2026E">3.0</span> after establishment of the facility. Material changes: trade receivables rise from DKK 2.55 million to DKK 3.55 million because of the 60-day credit on the GE Vernova agreement, the export facility is drawn by DKK 0.5 million at the end of 2026, and infusion line IL-2 (investment DKK 1.45 million) is capitalised. Net interest-bearing debt/EBITDA is expected to fall from 1.5 to 1.1, which is considered satisfactory.</p>
    </div>

    <p class="tpl-note">For acquisitions: Purchase multiples? <em>Not relevant for this case.</em></p>

    <h3 class="tpl-subhead">Cash flow and debt service capacity</h3>
    <em class="tpl-hint">The cash flow analysis should primarily be based on budgets. Realism should be seen in light of historical liquidity generation.</em>
    <ul class="tpl-hints">
      <li>Is there satisfactory liquidity generation from operations?</li>
      <li>Is the development in working capital realistic?</li>
      <li>Do investments match the longer-term need?</li>
      <li>Liquidity status, including whether drawings on working capital facilities are expected to stay within the limits granted by the bank?</li>
      <li>Is there satisfactory liquidity for debt repayments? Compared with normalised repayment obligations after expiry of any grace period. Short-term non-amortising debt (working capital facility and/or other) is measured against current assets (LTV)</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>Cash flow from operating activities was DKK 0.61 million in 2023 and DKK 0.80 million in 2024 (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9">Annual report 2024</span>); the 2025 annual report contains no cash flow statement. Working capital is tied up in step with growth: debtor days 23 in 2025 and 29 in the budget (60-day credit on the GE Vernova agreement), inventory days 52 in 2025 and 42 in the budget, creditor days 36. Investments in 2026 amount to DKK 1.5 million, mainly infusion line IL-2 for the Block Island order. The liquidity forecast in budget version 3 is reconciled to the actual figures at 31 August 2026: cash of DKK 2.08 million and DKK 1.12 million drawn on the DKK 1.50 million working capital facility (<span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Balance">balance sheet</span>). Liquidity bottoms out at <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">DKK 0.93 million at the end of October 2026</span>, when the working capital facility is fully drawn, and there is no undrawn headroom until the facility and the increase of the working capital facility are established on 1 November. The bank's application budget (version 2.2 from May) showed a low point of DKK 0.62 million in November with DKK 1.30 million of undrawn headroom. The amount available at the low point has therefore fallen from DKK 1.92 million to DKK 0.93 million, because the drawing on the working capital facility is DKK 0.6 million higher than assumed (1.50 against 0.90). In November GE Vernova's payment for DL-2 of approx. DKK 4.3 million is received, and the working capital facility is reduced to DKK 0.45 million. Repayments on long-term debt amount to DKK 0.45 million in 2026 (note 10 of the annual report), and interest cover (EBITDA/financial expenses) is 6.0 in the 2026 budget. With EBITDA of DKK 2.70 million and financial expenses of DKK 0.45 million in 2026 (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">budget</span>), debt service coverage on normalised repayments is 3.0, calculated as 2.70 / (0.45 + 0.45).</p>
    </div>

    <h3 class="tpl-subhead">Sensitivity analysis</h3>
    <em class="tpl-hint">Prepare one or more relevant sensitivity analyses, e.g.:</em>
    <ul class="tpl-hints">
      <li>Low case, e.g. with lower growth rates, lower earnings margins and/or termination of contracts</li>
      <li>Liquidity break-even revenue for debt service capacity when the initial grace period expires</li>
      <li>Sensitivity to interest rate and currency fluctuations (material unhedged interest and currency risks must be included in the risk assessment in section 5)</li>
      <li>Early stage: Can debt service capacity be achieved if development is put on hold? (fall-back scenario)</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <ul>
        <li><strong>Low case</strong> (2026 budget with revenue -15% and EBITDA margin -2 percentage points): revenue DKK 37.7 million and EBITDA approx. DKK 1.5 million (4.1%) against the budgeted DKK 2.7 million. With unchanged debt of DKK 8.2 million, debt/EBITDA rises to approx. 5.3 and breaches covenant C2 of max. 4.0. Calculated from the budget's revenue of <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat">DKK 44.40 million</span> and total debt of <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Balance">DKK 8.20 million</span> at the end of 2026: 44.4 x 0.85 = 37.7; 37.7 x 4.1% = 1.55; 8.2 / 1.55 = 5.3.</li>
        <li><strong>Payment timing:</strong> If GE Vernova's payment for DL-2 (DKK 4.32 million, due 24 November 2026) slips to January 2027, November 2026 ends at DKK -0.19 million and December 2026 at DKK -1.37 million before drawings on the export facility. With the facility and the increased working capital facility there is approx. DKK 5.2 million of undrawn headroom, so the delay can be absorbed. If the facility is not established on 1 November, the company is short by approx. DKK 0.8 million in November to keep the internal minimum of DKK 0.6 million (<span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Likviditet">liquidity forecast, comment 2</span>).</li>
        <li><strong>Liquidity break-even revenue</strong> (2026 budget): capacity costs of DKK 17.4 million plus interest of DKK 0.45 million and repayments of DKK 0.45 million covered by a gross margin of 45.3% give approx. DKK 40.4 million against the budgeted DKK 44.4 million, i.e. approx. 9% headroom.</li>
        <li><strong>Currency sensitivity:</strong> There are no forward contracts. A 10% fall in USD reduces the proceeds of the 2026 portion of the Block Island contract by approx. DKK 0.92 million (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 2">application, section 2.2</span>), and a 5% fall reduces profit before tax by approx. DKK 455k a year (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">note 18</span>). Material unhedged risk, cf. section 5.</li>
        <li><strong>Interest rate sensitivity:</strong> +1 percentage point increases interest costs by approx. DKK 23k on the current floating-rate debt (note 18) and by a further approx. DKK 45k with the export facility of DKK 4.5 million fully drawn. Limited.</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">Conclusion, risk assessment: <span class="tpl-risk mid">Medium</span></h3>
    <ul class="tpl-hints">
      <li>Realism of budgets? Is the budgeted earnings level satisfactory?</li>
      <li>Are the assets considered realistically valued, and is there a risk of extraordinarily large price falls in the event of bankruptcy?</li>
      <li>Is the debt service capacity satisfactory?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>The 2026 budget is considered realistic and rather conservative: eight months of realised revenue and the order book for the rest of the year cover approx. 110% of the full-year budget, because the budget phases Block Island differently from the delivery plan. 2027 and 2028 rely more on framework agreements, and the order book covers 60.6% of the next four quarters' budgeted revenue. The assets are considered realistically valued, but the realisable value in a bankruptcy is limited: the machinery is valued at DKK 2.1 million in a quick sale (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S1">S1</span>), and the bank's ranking overview shows total encumbrances of DKK 4.1 million without the mortgage loan (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S2">S2</span>). Including the loan, encumbrances are calculated at approx. 147% of the public valuation, cf. section 5. Debt service capacity is sufficient in the base case but sensitive to the timing of GE Vernova's payment, the USD rate and lower earnings (the low case breaches covenant C2).</p>
    </div>

    <h3 class="tpl-subhead">Key figures table</h3>
    <p class="tpl-note">[Insert "Table" with accounting and budget figures (income statement, balance sheet and cash flow) from the Excel sheet or extracted from the company's material.]</p>
    <table>
      <thead><tr><th>Key figures</th><th style="text-align:right">2023</th><th style="text-align:right">2024</th><th style="text-align:right">2025</th></tr></thead>
      <tbody>
        <tr><td>Gross margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2023">45.7%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2024">46.3%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2025">45.0%</span></td></tr>
        <tr><td>EBITDA margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2023">4.6%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2024">5.8%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5.8%</span></td></tr>
        <tr><td>Solvency ratio</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2023">37.2%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2024">42.9%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Soliditetsgrad %" data-col="2025">44.3%</span></td></tr>
        <tr><td>Debt / EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2023">4.5×</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2024">3.4×</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3.3×</span></td></tr>
        <tr><td>Current ratio</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2023">216.7%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2024">246%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Likviditetsgrad" data-col="2025">250%</span></td></tr>
      </tbody>
    </table>
  `,

  endorsement: `
    <table class="tpl-bevtable">
      <thead><tr><th colspan="3">Recommendation sign-off</th></tr></thead>
      <tbody>
        <tr>
          <td class="label">Date:</td>
          <td><span class="tpl-blank">[date]</span></td>
          <td style="width:30%"><strong>Recommendation level:</strong> <span class="tpl-blank">Relationship manager</span> · <strong>Initials:</strong> <span class="tpl-blank">[initials]</span></td>
        </tr>
        <tr>
          <td class="label" style="vertical-align:top">Comments:</td>
          <td colspan="2"><span class="tpl-blank">[Recommender's comments]</span></td>
        </tr>
      </tbody>
    </table>

    <table class="tpl-bevtable">
      <thead><tr><th colspan="3">Approval sign-off</th></tr></thead>
      <tbody>
        <tr>
          <td class="label">Date:</td>
          <td><span class="tpl-blank">[date]</span></td>
          <td style="width:30%"><strong>Approval authority:</strong> <span class="tpl-blank">Credit committee</span> · <strong>Initials:</strong> <span class="tpl-blank">[initials]</span></td>
        </tr>
        <tr>
          <td class="label" style="vertical-align:top">Comments / minutes from credit committee / BBU / the Board:</td>
          <td colspan="2"><span class="tpl-blank">[Minutes from approval meeting]</span></td>
        </tr>
      </tbody>
    </table>
  `,

  appendix1: `
    <p class="tpl-note">[For all sections: content that is not relevant is deleted]</p>

    <h3 class="tpl-subhead">Exposure</h3>
    <table>
      <thead><tr><th>Existing + requested exposure</th><th style="text-align:right">DKK m</th><th>Term</th><th>First repayment / drawdown period</th><th>First interest</th><th>Loan profile</th></tr></thead>
      <tbody>
        <tr><td>Existing exposure with EIFO</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Ratingberegning_2026-0184.pdf" data-page="s. 1">0.0</span></td><td colspan="4"><span class="tpl-blank">[to be confirmed in EIFO's exposure overview]</span></td></tr>
        <tr><td><strong>EIFO export guarantee, new, 80% pari passu cover of an export facility of DKK 4.5 million</strong></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">3.6</span></td><td><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">30 months (1 Nov 2026 to 30 Apr 2029)</span></td><td>Revolving drawings from 1 Nov 2026</td><td>Premium 1.10% p.a.</td><td>Revolving; drawing cap DKK 3.0 million in Q1 2027 and DKK 2.0 million from 30 Jun 2027</td></tr>
        <tr><td><strong>Total EIFO</strong></td><td style="text-align:right;font-family:monospace;font-weight:600">3.6</td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>

    <p><strong>Guarantee holder / Co-financing bank:</strong> Nordjyske Bank A/S, contact: business adviser <span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">Lars Thomsen, lth@nordjyskebank.dk</span></p>
    <p><strong>Loss mandates:</strong> None <span class="tpl-blank">[or state mandate]</span></p>
    <ul>
      <li>Checklist for the chosen loss mandate has been completed <span class="tpl-blank">[yes/no]</span></li>
      <li><span class="tpl-blank">Max. two lines of justification for choosing "no loss mandate" if the criteria for a mandate are met</span></li>
    </ul>

    <h3 class="tpl-subhead">Margin / premium</h3>
    <ul>
      <li>Export facility: floating CIBOR3 rate plus a margin of <strong>3.00 percentage points</strong> (5.15% p.a. at a CIBOR3 of 2.15% as of 1 June 2026); working capital facility: CIBOR3 plus 4.00 percentage points (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">application, section 4.2</span>)</li>
      <li>Premium (EIFO guarantee): assumed <strong>1.10% p.a.</strong> of the outstanding guaranteed amount, approx. DKK 39,600 p.a. when fully drawn; re-invoiced to the company</li>
      <li><span class="tpl-blank">Max. two lines of justification for deviation from the calculated margin/premium</span></li>
    </ul>

    <h3 class="tpl-subhead">Arrangement / establishment fee</h3>
    <p>Standard: 0.75% of principal + DKK 15,000 per facility, equal to DKK 42,000 on the guarantee of DKK 3.6 million. The bank's arrangement fee on the export facility is 0.75% of DKK 4.5 million, DKK 33,750 in total, and the commitment fee on the undrawn limit is 0.50% p.a.</p>

    <h3 class="tpl-subhead">Commitment fee / Break fee</h3>
    <ul>
      <li>Commitment fee: not relevant for an export guarantee. The bank charges a fee on the undrawn limit of 0.50% p.a. (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">application, section 4.2</span>)</li>
      <li>Break fee: not relevant for an export guarantee</li>
    </ul>

    <h3 class="tpl-subhead">Exit fee</h3>
    <p>None, not relevant for an export guarantee.</p>

    <h3 class="tpl-subhead">Collateral [loans and guarantees]</h3>
    <p><strong>Existing collateral with Nordjyske Bank, in which EIFO is to rank pari passu:</strong></p>
    <ul>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S1">3.2 million chattel mortgage on machinery and production plant</span>, registered 22 January 2026. Realisable value in a quick sale DKK 2.1 million.</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S2">2.5 million owner's mortgage on Havnegade 42</span> (2nd priority after an owner's mortgage of DKK 1.6 million according to the bank's overview), registered 14 January 2026. The overview shows total encumbrances of 100% of the public valuation of DKK 4.1 million, but omits the mortgage loan (outstanding approx. DKK 1.9 million), which according to note 10 of the annual report is secured on the property. Including the loan, encumbrances are approx. 147%, and the owner's mortgage of DKK 2.5 million has no real cover. A land register certificate is obtained.</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S3">4.5 million floating charge over receivables</span>, registered 20 January 2026. Does not cover inventory and work in progress.</li>
      <li>DKK <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S4">1.0 million personal joint and several guarantee from Anders Christensen</span>, signed 15 January 2026. An updated statement of assets is missing.</li>
    </ul>
    <p><strong>New collateral and documents still missing:</strong></p>
    <ul>
      <li>Company guarantee from Nordhavn Holding ApS, CVR no. 41096623, max. <span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S5">DKK 2.0 million</span>: <strong>draft, not signed</strong>, and a corporate resolution is missing.</li>
      <li>Subordination declaration from Anders Christensen personally regarding the shareholder loan of DKK 0.5 million: <strong>missing</strong>.</li>
      <li>Registered addenda or a new pledge declaration on EIFO's pari passu ranking in the chattel mortgage, owner's mortgage and floating charge: <strong>not in place as of 4 August 2026</strong>.</li>
      <li>Share pledges are not part of the security package, and no restrictions are noted in the register of shareholders.</li>
    </ul>

    <h3 class="tpl-subhead">Covenants and declarations [loans and guarantees]</h3>
    <ul>
      <li><strong>C1 Solvency:</strong> minimum 35.0%, measured quarterly; the shareholder loan is not counted as equity without a subordination declaration.</li>
      <li><strong>C2 Debt/EBITDA:</strong> maximum 4.0 (last 12 months).</li>
      <li><strong>C3 Dividend restriction:</strong> no distribution while the facility is drawn by more than DKK 1.0 million, and never above 30% of the profit for the year.</li>
      <li><strong>C4 Shareholder loan:</strong> no repayments, interest or other payments on the loan during the guarantee period.</li>
      <li><strong>C5 Change of control:</strong> renegotiation if more than 30% of the capital changes owner or Anders Holding ApS ceases to be the majority owner.</li>
      <li><strong>C6 Currency hedging:</strong> at least 70% of the remaining contract value under GEV-BI-2025-0447 hedged by 1 December 2026; written currency policy adopted by 30 November 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">the amendment, item 3</span>).</li>
      <li>First test as of 31 December 2026 on audited figures (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">application, section 4.3</span>).</li>
      <li>Condition for fulfilment of VK 1-3 [green covenants]: <span class="tpl-blank">[N/A, not green financing]</span></li>
    </ul>

    <h3 class="tpl-subhead">Reporting [loans and guarantees]</h3>
    <ul>
      <li>Audited annual report no later than 4 months after the end of the financial year (R2)</li>
      <li>Quarterly accounts with balance sheet and liquidity statement plus a covenant certificate no later than 30 days after quarter end (R1, R3)</li>
      <li>Receivables list monthly while drawings exceed DKK 3.0 million; order book report and rolling 12-month liquidity budget quarterly (R4-R6)</li>
      <li>Immediate notice of order changes above DKK 1.0 million and of changes in management, auditor or ownership, including exercise of warrants (R7, R8)</li>
      <li>Group consolidation prepared by the auditor? No, the company has no subsidiaries.</li>
    </ul>

    <h3 class="tpl-subhead">Special conditions [EIFO guarantees]</h3>
    <p>The guarantee premium rate is set at <strong>1.10%</strong> p.a. The guarantee holder has stated that the interest margin on the credit facility is <strong>3.00%</strong> p.a. If the guarantee holder increases the interest margin, EIFO must be informed and the premium to EIFO increased by the same percentage.</p>
    <p><strong>Deviations from and/or additional requirements relative to the General Terms:</strong> <span class="tpl-blank">[Wording must follow the wording in the Special Conditions Catalogue. Insert conditions here]</span></p>

    <p><strong>Before issue of the policy, the following must be fulfilled and documented:</strong></p>
    <ul>
      <li>Signed subordination declaration from Anders Christensen on the shareholder loan of DKK 0.5 million (B2)</li>
      <li>Signed company guarantee from Nordhavn Holding ApS with a corporate resolution (B1)</li>
      <li>Documentation of forward hedging of at least 70% of the remaining contract value or a binding order for it (B4, C6)</li>
      <li>Registered addenda on EIFO's pari passu ranking in the chattel mortgage, owner's mortgage and floating charge</li>
      <li>Land register certificate for Havnegade 42 showing the ranking of the mortgage loan</li>
      <li>Certified copy of framework agreement GEV-BI-2025-0447 with payment terms (B5): received on 16 September 2026 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 5">the amendment, item 5</span>)</li>
    </ul>

    <h3 class="tpl-subhead">Disbursement conditions [loans and guarantees]</h3>
    <ul>
      <li><strong>Drawings:</strong> Revolving drawings on the export facility against documented material invoices or calculated work in progress within the limit of DKK 4.5 million; max. drawing DKK 3.0 million in Q1 2027 and DKK 2.0 million from 30 June 2027 (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">application, section 4.1</span>).</li>
      <li><strong>First disbursement:</strong> no earlier than establishment on 1 November 2026 and requires conditions B1-B5 to be fulfilled, including EIFO's final guarantee commitment (B3) by 31 October 2026. Disbursement deadline: <span class="tpl-blank">[date]</span></li>
    </ul>

    <h3 class="tpl-subhead">Bank exposure</h3>
    <table>
      <thead><tr><th>Nordjyske Bank</th><th style="text-align:right">DKK m</th><th>Term</th><th>Interest</th></tr></thead>
      <tbody>
        <tr><td>Term loan, existing</td><td style="text-align:right;font-family:monospace">1.8</td><td>Remaining term 6 years and 3 months</td><td>4.2%</td></tr>
        <tr><td>Working capital facility, increased from 1.5 as of 1 Nov 2026</td><td style="text-align:right;font-family:monospace">2.2</td><td>Until 30 Jun 2027, then annual renewal</td><td>CIBOR3 + 4.00%</td></tr>
        <tr><td>Export facility, new (of which EIFO guarantee 3.6)</td><td style="text-align:right;font-family:monospace">4.5</td><td>1 Nov 2026 to 30 Apr 2029</td><td>CIBOR3 + 3.00%</td></tr>
        <tr><td><strong><span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 1">Total gross exposure</span></strong></td><td style="text-align:right;font-family:monospace;font-weight:600">8.5</td><td></td><td></td></tr>
        <tr><td>Bank's net risk after EIFO guarantee</td><td style="text-align:right;font-family:monospace">4.9</td><td></td><td></td></tr>
      </tbody>
    </table>

    <h3 class="tpl-subhead">Bank collateral</h3>
    <p><strong>Existing:</strong></p>
    <ul>
      <li>Owner's mortgages on Havnegade 42 of DKK 1.6 million and DKK 2.5 million, pledged to the bank, ranking after the mortgage loan (see above)</li>
      <li>Chattel mortgage on machinery, DKK 3.2 million</li>
      <li>Floating charge over receivables, DKK 4.5 million</li>
      <li>Personal guarantee from Anders Christensen, DKK 1.0 million</li>
    </ul>
    <p><strong>New / increased:</strong></p>
    <ul>
      <li>Company guarantee from Nordhavn Holding ApS, max. DKK 2.0 million (draft)</li>
      <li>EIFO ranks pari passu with the bank in all collateral and is not subordinated (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">application, section 4.5</span>)</li>
    </ul>

    <h3 class="tpl-subhead">Intercreditor agreement</h3>
    <p>Standard with overdraft right of DKK 0.5 million for up to three months without involving EIFO (<span class="memo-cite" data-doc="Bankansoegning_Nordjyske_Bank.pdf" data-page="s. 4">application, section 4.5</span>).</p>
  `,

  appendix2: `
    <p class="tpl-note">[For all sections: content that is not relevant is deleted]</p>

    <h3 class="tpl-subhead">[For EIFO products &lt; DKK 50 million not concerning financing on EIFO's watch list]</h3>
    <p>ESG is handled via a standard declaration and contains only an obligation to comply with the minimum safeguards.</p>

    <p class="tpl-note">[ESG risks are assessed based on the guiding questions below]</p>

    <h3 class="tpl-subhead">The company's work with ESG [focusing on risk management]</h3>
    <ul class="tpl-hints">
      <li>Has the company established an ESG management system that effectively and systematically handles the company's risk management within environmental and social matters?</li>
      <li>Does the company have written policies and/or procedures for handling ESG risks?</li>
      <li>Has the company made its expectations and minimum requirements for responsible business conduct clear to suppliers, e.g. contracts, Code of Conduct or similar?</li>
      <li>Has the company mapped known risks that the company or its supply chain may be connected to?</li>
      <li>Has the company, based on the risk assessment, initiated concrete initiatives to handle risks?</li>
      <li>Does the company have a grievance mechanism (whistleblower scheme) available to its stakeholders for reporting objectionable conditions in the value chain?</li>
      <li>Does the company use audit programmes, e.g. ISO 9001, ISO 14001, ISO 45001 or similar?</li>
    </ul>
    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <ul>
        <li><strong>Management system:</strong> ISO 9001:2015 certified (Bureau Veritas, valid until 13 February 2027; latest follow-up audit in December 2025 without material non-conformities). Implementation of ISO 14001 has been decided with a view to certification in 2027 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 11">CSR/ESG statement</span>).</li>
        <li><strong>Policies:</strong> Supplier Code of Conduct of 1 July 2024 and a policy of 14 March 2024 on female candidates for management positions. Other written ESG policies are not documented. <span class="tpl-blank">[other policies]</span></li>
        <li><strong>Supplier requirements:</strong> The Code of Conduct has been accepted by suppliers representing 82% of total purchases.</li>
        <li><strong>Risk mapping:</strong> The most significant impacts are energy consumption, fibre and resin waste, chemicals handling and the working environment in grinding and bonding. Scope 3 has not yet been calculated.</li>
        <li><strong>Initiatives:</strong> LED lighting and heat recovery on the autoclave (energy intensity improved 14.7%), waste reduced from 8.6% to 7.4%, cooperation on recycling cured epoxy composite and local extraction at the grinding stations.</li>
        <li><strong>Whistleblower:</strong> Scheme set up via an external provider; no reports in 2025.</li>
        <li><strong>Working environment:</strong> 3 lost-time accidents in 2025 (LTIF 8.2 against 11.6 in 2024). The Working Environment Authority gave guidance, no improvement notices.</li>
        <li><strong>Audit programmes:</strong> ISO 9001 (active) and ISO 14001 (being implemented). The statement is voluntary and not audited.</li>
      </ul>
    </div>

    <h3 class="tpl-subhead">[For EIFO products &gt; DKK 50 million or on EIFO's watch list]</h3>
    <p class="tpl-note">Not relevant for this case (facility below DKK 50 million). The section can be deleted.</p>
    <p><strong>ESG risks:</strong> <em class="tpl-hint">ESG's assessment states the following conclusion: [insert 1) Overall conclusion, 2) Illustration in the form of a spider chart showing the current and desired ESG performance of the company's management system, 3) Illustration of ESG's assessment of the business's ESG risk profile]</em></p>

    <h3 class="tpl-subhead">Conclusion, risk assessment: <span class="tpl-risk lav">Low</span></h3>
    <p>The ESG handling is considered satisfactory for the size of the facility and the industry. The company's focus on renewable energy (wind turbine components) supports EIFO's strategic ESG focus.</p>
  `,

  appendix3: `
    <p class="tpl-note">[If no chart exists, it can be created via the Excel file "Koncernstruktur Template" available in Templafy]</p>

    <div class="tpl-draft">
      <span class="tpl-draft-label" contenteditable="false">Draft</span>
      <p>Ownership and group relations as of 30 June 2026 (<span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2">register of shareholders, group overview</span>). The borrower has no subsidiaries and is not part of a legal group:</p>
      <pre style="font-family: var(--mono); font-size: 11.5px; line-height: 1.5; background: var(--c-surface-2); padding: 10px 14px; border-radius: 6px; margin: 6px 0;">
Anders Christensen
  | 100%
Anders Holding ApS
  +- 50.7% -> Nordhavn Composite A/S &lt;- Erhvervsfonden 23.6%
  |           CVR 38427156           &lt;- Maria Lindbjerg 15.6%
  |           (borrower)             &lt;- Industrifonden A/S 10.1%
  |
  +- 66.7% -> Nordhavn Holding ApS   &lt;- Maria Lindbjerg 33.3%
               CVR 41096623
                 | 100%
               Nordhavn Production ApS
               CVR 41096631 (sister company)
      </pre>
      <table>
        <thead><tr><th>Company</th><th>CVR</th><th>Share of borrower</th><th>Activity</th></tr></thead>
        <tbody>
          <tr><td><strong>Nordhavn Composite A/S</strong> (borrower)</td><td style="font-family:monospace">38427156</td><td>-</td><td>Composite components for the wind industry, Frederikshavn and Sæby</td></tr>
          <tr><td>Anders Holding ApS</td><td style="font-family:monospace">36710984</td><td>50.7%</td><td>Holding company, wholly owned by Anders Christensen</td></tr>
          <tr><td>Nordhavn Holding ApS</td><td style="font-family:monospace">41096623</td><td>0%</td><td>Holding company (Anders Holding ApS 66.7%, Maria Lindbjerg 33.3%); proposed guarantor</td></tr>
          <tr><td>Nordhavn Production ApS</td><td style="font-family:monospace">41096631</td><td>0%</td><td>Surface treatment, finishing and packing; 6 employees</td></tr>
        </tbody>
      </table>
      <p>The balance with Nordhavn Production ApS was DKK 62,000 in the borrower's favour as of 30 June 2026, and trading takes place on market terms. Nordhavn Production ApS is not part of the security package.</p>
    </div>

    <h3 class="tpl-subhead">Appendix list (case file)</h3>
    <table>
      <thead><tr><th style="width:28px">#</th><th>Document</th><th>Type</th><th>Date</th></tr></thead>
      <tbody>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">1</td><td>Aarsrapport_2025.pdf</td><td>Annual report</td><td style="color:var(--c-text-2)">8 Apr 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">2</td><td>Aarsrapport_2024.pdf</td><td>Annual report</td><td style="color:var(--c-text-2)">27 Mar 2025</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">3</td><td>Aarsrapport_2023.pdf</td><td>Annual report</td><td style="color:var(--c-text-2)">18 Apr 2024</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">4</td><td>Periodetal_jan-aug_2026.xlsx</td><td>Interim figures</td><td style="color:var(--c-text-2)">14 Sep 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">5</td><td>Budget_2026-28_v3.xlsx</td><td>Budget</td><td style="color:var(--c-text-2)">11 Sep 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">6</td><td>Bankansoegning_Nordjyske_Bank.pdf</td><td>Application</td><td style="color:var(--c-text-2)">23 Sep 2026 (amendment to application of 2 Jun 2026)</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">7</td><td>GE_Vernova_rammekontrakt.pdf</td><td>Contract</td><td style="color:var(--c-text-2)">14 Jul 2026 (signed 9 Dec 2025)</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">8</td><td>Sikkerhedsdokumenter.pdf</td><td>Collateral</td><td style="color:var(--c-text-2)">4 Aug 2026</td></tr>
        <tr><td style="font-family:monospace;color:var(--c-text-2)">9</td><td>Ejerbog_2026.pdf</td><td>Corporate</td><td style="color:var(--c-text-2)">3 Aug 2026</td></tr>
      </tbody>
    </table>
  `,
};

// Den danske udgave gemmes, så kildekontrollen på engelsk kan slå den danske
// formulering op: kilderne er danske
const SEC_DA = Object.assign({}, SEC);
if (MEMO_EN) Object.assign(SEC, SEC_EN);

/* ── Sources per section (EIFO template-sektioner) ───────────────────────── */
/* Navne og sidehenvisninger her skal matche window.CASE_DOCS ordret. Listen
   styrer både kildepanelet og hvilke dokumenter AI'en får som grundlag for
   det enkelte afsnit. */
const MEMO_SOURCES = {
  background:  [{ t: "Aarsrapport_2025.pdf", p: "s. 2, s. 4 -Selskabsoplysninger og ledelsesberetning" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "s. 1 -projektoversigt" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 2 -bankens motiv" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197" }],
  financing:   [{ t: "Budget_2026-28_v3.xlsx", p: "linje 197 -finansieringsplan" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "§4 -betalingsbetingelser" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 1, s. 4, s. 5 -vilkår og tillæg" }, { t: "Sikkerhedsdokumenter.pdf", p: "S1-S5" }],
  rating:      [{ t: "Periodetal_jan-aug_2026.xlsx", p:"ark Kunder" }, { t: "Aarsrapport_2025.pdf", p: "s. 9 -Nøgletal" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 3 -bankens rating" }, { t: "Ratingberegning_2026-0184.pdf", p: "s. 1, s. 2 -ratingberegning" }],
  legal:       [{ t: "GE_Vernova_rammekontrakt.pdf", p: "§11, §14" }, { t: "Aarsrapport_2025.pdf", p: "note 14 -Anpartshaverlån" }, { t: "Sikkerhedsdokumenter.pdf", p: "S5 -afventer underskrift" }],
  risk:        [{ t: "Periodetal_jan-aug_2026.xlsx", p:"ark Kunder, ark Ordrebog" }, { t: "Aarsrapport_2025.pdf", p: "note 18 -risici" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "§3, §7" }],
  conclusion:  [{ t: "Aarsrapport_2025.pdf", p: "s. 6, s. 9" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197, ark Likviditet" }, { t: "Periodetal_jan-aug_2026.xlsx", p:"ark Resultat" }, { t: "Sikkerhedsdokumenter.pdf", p: "S5" }],
  ownership:   [{ t: "Ejerbog_2026.pdf", p: "s. 1, s. 3-4" }, { t: "Aarsrapport_2025.pdf", p: "note 14 -Anpartshaverlån" }, { t: "Sikkerhedsdokumenter.pdf", p: "S4 -personlig kaution" }],
  product:     [{ t: "Aarsrapport_2025.pdf", p: "s. 4 -Forretningsmodel" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "s. 1, §2" }],
  market:      [{ t: "Periodetal_jan-aug_2026.xlsx", p:"ark Kunder" }, { t: "Aarsrapport_2025.pdf", p: "s. 4 -Markedsforhold" }],
  financial:   [{ t: "Aarsrapport_2025.pdf", p: "s. 6-9, s. 14 -Revisionspåtegning" }, { t: "Aarsrapport_2024.pdf", p: "s. 6-9" }, { t: "Aarsrapport_2023.pdf", p: "s. 6-9" }, { t: "Periodetal_jan-aug_2026.xlsx", p:"ark Resultat, ark Balance" }, { t: "Budget_2026-28_v3.xlsx", p: "ark Resultat, ark Likviditet" }],
  endorsement: [],
  appendix1:   [{ t: "Sikkerhedsdokumenter.pdf", p: "S1-S5" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 4, s. 5 -covenants og tillæg" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197" }],
  appendix2:   [{ t: "Aarsrapport_2025.pdf", p: "s. 11 -CSR/ESG note" }],
  appendix3:   [{ t: "Ejerbog_2026.pdf", p: "s. 2 -Datterselskaber" }, { t: "Aarsrapport_2025.pdf", p: "s. 2 -Selskabsoplysninger" }],
};

/* ── Afsnittene ───────────────────────────────────────────────────────────── */
const MEMO_SECTIONS = [
  { k: "background",  num: "1",  label: "Baggrund og formål" },
  { k: "financing",   num: "2",  label: "Finansieringsstruktur" },
  { k: "rating",      num: "3",  label: "Rating" },
  { k: "legal",       num: "4",  label: "Juridiske forhold" },
  { k: "risk",        num: "5",  label: "Risikovurdering" },
  { k: "conclusion",  num: "6",  label: "Konklusion og indstilling" },
  { k: "ownership",   num: "7",  label: "Ejerstruktur, ledelse, bestyrelse og rådgivere" },
  { k: "product",     num: "8",  label: "Produkter, forretningsmodel og strategi" },
  { k: "market",      num: "9",  label: "Marked, konkurrence, kunder og leverandører" },
  { k: "financial",   num: "10", label: "Finansiel analyse" },
  { k: "endorsement", num: "11", label: "Indstillings- og bevillingspåtegning" },
  { k: "appendix1",   num: "B1", label: "Bilag 1: Vilkår" },
  { k: "appendix2",   num: "B2", label: "Bilag 2: ESG" },
  { k: "appendix3",   num: "B3", label: "Bilag 3: Koncerndiagram" },
];

/* Den der sidder ved tasterne i demoen. Står på gennemgangene. */
const MEMO_REVIEWER = 'Mette Larsen';

function memoKey(k) { return 'memo4:' + k + LANG_SUFFIX; }
function memoTouchedKey(k) { return 'memo4:touched:' + k + LANG_SUFFIX; }
/* Gennemgangen hører til afsnittet, ikke sproget: samme nøgle på dansk og
   engelsk, så et sprogskift ikke nulstiller den. */
function memoReviewKey(k) { return 'memo4:review:' + k; }

/* Skabelonens vejledning, som ikke er en del af teksten */
const MEMO_SCAFFOLD = '.tpl-hints, .tpl-hint, .tpl-subhead, .tpl-note, .tpl-guide';

/* ── Gennemgangens fingeraftryk ──────────────────────────────────────────────
   En gennemgang gælder den tekst, der stod, da den blev givet, på begge sprog.
   Ved gennemgang gemmes et fingeraftryk af den danske og den engelske tekst.
   Ændres teksten bagefter (et tal, et ord, på et af sprogene), passer
   aftrykket ikke længere, og afsnittet står som "Ændret efter gennemgang".
   ──────────────────────────────────────────────────────────────────────────── */
function _memoLangSuffix(lang) { return lang === 'en' ? ':en' : ''; }
function _memoSeedFor(lang, k) { return lang === 'en' && SEC_EN[k] != null ? SEC_EN[k] : SEC_DA[k]; }
function _memoSeedStamp(lang) {
  return MEMO_SEED_VERSION + ':' + _memoHash(MEMO_SECTIONS.map(s => s.k + '=' + (_memoSeedFor(lang, s.k) || '')).join('\n'));
}
/* Afsnittets tekst på et bestemt sprog: det gemte, ellers skabelonens udkast */
function _memoLangHtml(k, lang) {
  let saved = null;
  try { saved = localStorage.getItem('memo4:' + k + _memoLangSuffix(lang)); } catch (e) {}
  return saved !== null ? saved : stampSeed(_memoSeedFor(lang, k) || '');
}
/* CW_MEMO_STATUS kaldes ofte (klarhedstjek, faner, sagshoved). Aftrykket af en
   given tekst huskes, så teksten ikke skal fortolkes igen ved hvert kald. */
const _memoSigCache = new Map();
function _memoTextSig(html) {
  html = html || '';
  const hit = _memoSigCache.get(html);
  if (hit) return hit;
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove());
  const sig = _memoHash(d.textContent.replace(/\s+/g, ' ').trim());
  if (_memoSigCache.size > 120) _memoSigCache.clear();
  _memoSigCache.set(html, sig);
  return sig;
}
function _memoSigs(k) { return { da: _memoTextSig(_memoLangHtml(k, 'da')), en: _memoTextSig(_memoLangHtml(k, 'en')) }; }
/* Udkastmærkerne fjernes, når rådgiveren står inde for afsnittet. null hvis der ingen var. */
function _memoStripDrafts(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  if (!d.querySelector('.tpl-draft-label, .tpl-draft')) return null;
  d.querySelectorAll('.tpl-draft-label').forEach(el => el.remove());
  d.querySelectorAll('.tpl-draft').forEach(el => el.classList.remove('tpl-draft'));
  return d.innerHTML;
}
/* Gennemgangen gælder også det andet sprog: dets udkastmærker fjernes. Har
   sproget ikke været åbnet før, sættes dets seed-version, så teksten ikke
   ryddes første gang der skiftes. */
function _memoApplyReviewTo(k, lang) {
  const next = _memoStripDrafts(_memoLangHtml(k, lang));
  if (next == null) return;
  try {
    const vk = 'memo4-seed-version' + _memoLangSuffix(lang);
    if (localStorage.getItem(vk) === null) localStorage.setItem(vk, _memoSeedStamp(lang));
    localStorage.setItem('memo4:' + k + _memoLangSuffix(lang), next);
  } catch (e) {}
}

/* Tidligere blev gennemgangen gemt pr. sprog (memo4:review:<afsnit>:en for
   engelsk). Den flyttes til den fælles nøgle med fingeraftryk. Kaldes af
   applyMemoSeedVersion nedenfor, før den rydder gamle tekster. */
function migrateMemoReviews() {
  try {
    const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
    MEMO_SECTIONS.forEach(s => {
      const shared = read(memoReviewKey(s.k));
      const en = read(memoReviewKey(s.k) + ':en');
      localStorage.removeItem(memoReviewKey(s.k) + ':en');
      if (shared && shared.sig) return;
      const pick = shared && en ? (String(en.at) > String(shared.at) ? en : shared) : (shared || en);
      if (!pick || !pick.by) return;
      _memoApplyReviewTo(s.k, 'da');
      _memoApplyReviewTo(s.k, 'en');
      localStorage.setItem(memoReviewKey(s.k), JSON.stringify({ by: pick.by, at: pick.at, sig: _memoSigs(s.k) }));
    });
  } catch (e) {}
}

/* ── Seed-version ────────────────────────────────────────────────────────────
   Memoets tekst gemmes pr. afsnit i localStorage (memo4:<afsnit>). Rettes
   skabelonens eksempeltekst i SEC, skal rettelsen slå igennem hos brugere der
   har gamle data liggende, ellers ser de stadig de gamle fejl. Versionen er
   konstanten plus et fingeraftryk af selve teksten, så en rettelse i SEC
   opdages af sig selv; bump MEMO_SEED_VERSION for at tvinge det igennem.
   Afsnit rådgiveren selv har skrevet i eller gennemgået, bevares. Uden en
   tidligere version kan det ikke afgøres, så der ryddes alt.
   ──────────────────────────────────────────────────────────────────────────── */
const MEMO_SEED_VERSION = '2026-09-29.1';

function _memoHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const MEMO_SEED_STAMP = MEMO_SEED_VERSION + ':' + _memoHash(MEMO_SECTIONS.map(s => s.k + '=' + (SEC[s.k] || '')).join('\n'));

(function applyMemoSeedVersion() {
  migrateMemoReviews();
  try {
    const vk = 'memo4-seed-version' + LANG_SUFFIX;
    const prev = localStorage.getItem(vk);
    if (prev === MEMO_SEED_STAMP) return;
    MEMO_SECTIONS.forEach(s => {
      const keep = prev !== null && (localStorage.getItem(memoTouchedKey(s.k)) || localStorage.getItem(memoReviewKey(s.k)));
      if (keep) return;
      // Gennemgangen er fælles for begge sprog og ryddes ikke her. Passer
      // teksten ikke længere, viser fingeraftrykket det.
      localStorage.removeItem(memoKey(s.k));
      localStorage.removeItem(memoTouchedKey(s.k));
      localStorage.removeItem('memo4:snap:' + s.k + LANG_SUFFIX);
    });
    localStorage.setItem(vk, MEMO_SEED_STAMP);
  } catch (e) {}
})();

/* ── Ophav og gennemgang ─────────────────────────────────────────────────────
   Skabelonens eksempeltekst er et udkast på linje med AI'ens. Den får samme
   ophavsmærke (data-ai="seed"), så "Vis ophav" ikke krediterer rådgiveren for
   tekst hun ikke har skrevet. Et afsnit er gennemgået når rådgiveren aktivt
   har markeret det, med navn og tidspunkt. Kommer der nyt udkast ind bagefter
   (AI, chat), er afsnittet ikke gennemgået længere.
   ──────────────────────────────────────────────────────────────────────────── */
// MEMO_SCAFFOLD er defineret ved memoReviewKey ovenfor

function stampSeed(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  Array.from(d.children).forEach(el => {
    if (el.matches(MEMO_SCAFFOLD) || el.getAttribute('data-ai')) return;
    el.setAttribute('data-ai', 'seed');
  });
  return d.innerHTML;
}

function loadReview(k) {
  try { return JSON.parse(localStorage.getItem(memoReviewKey(k)) || 'null'); } catch (e) { return null; }
}
/* Gemmer gennemgangen med fingeraftryk af teksten på begge sprog. Kaldes
   efter at afsnittets tekst er gemt. Udkastmærkerne på det andet sprog
   fjernes også, for gennemgangen gælder afsnittet. */
function saveReview(k, v) {
  try {
    if (!v) { localStorage.removeItem(memoReviewKey(k)); return; }
    _memoApplyReviewTo(k, MEMO_EN ? 'da' : 'en');
    localStorage.setItem(memoReviewKey(k), JSON.stringify({ by: v.by, at: v.at, sig: _memoSigs(k) }));
  } catch (e) {}
}
/* Rådgiveren har selv skrevet i afsnittet. Bruges af seed-versioneringen. */
function markTouched(k) { try { localStorage.setItem(memoTouchedKey(k), '1'); } catch (e) {} }
function emitMemoChanged(k) {
  try { window.dispatchEvent(new CustomEvent('memo-changed', { detail: { sKey: k } })); } catch (e) {}
}

function savedSectionHtml(k) {
  try { return localStorage.getItem(memoKey(k)); } catch (e) { return null; }
}
/* Det skærmen viser: det gemte, ellers skabelonens udkast */
function sectionHtml(k) {
  const saved = savedSectionHtml(k);
  return saved !== null ? saved : stampSeed(SEC[k] || '');
}

/**
 * Status for ét afsnit, beregnet af teksten alene, så den også kan læses når
 * memoet ikke er vist. state: 'empty' | 'draft' (udkast, ikke gennemgået) |
 * 'blanks' (felter mangler) | 'done'.
 */
function memoSectionStatus(k, htmlOverride, reviewOverride) {
  const saved = savedSectionHtml(k);
  const html = htmlOverride != null ? htmlOverride : (saved !== null ? saved : stampSeed(SEC[k] || ''));
  const d = document.createElement('div');
  d.innerHTML = html;
  const blanks = d.querySelectorAll('.tpl-blank').length;
  const drafts = d.querySelectorAll('.tpl-draft').length;
  const machine = d.querySelectorAll('[data-ai]').length;
  // Den indstillede version har sin egen gennemgang med (reviewOverride).
  // Ellers gælder den gemte gennemgang kun, hvis teksten er den samme.
  let review = reviewOverride !== undefined ? reviewOverride : loadReview(k);
  let stale = null;
  if (reviewOverride === undefined && review && review.sig) {
    const now = _memoSigs(k);
    if (now.da !== review.sig.da || now.en !== review.sig.en) { stale = { by: review.by, at: review.at }; review = null; }
  }
  d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove());
  const hasContent = d.textContent.replace(/\s+/g, '').length > 0;
  const reviewed = !!review && drafts === 0;
  const unreviewed = hasContent && !reviewed && (drafts > 0 || machine > 0 || saved === null || !!stale);
  const state = !hasContent ? 'empty' : unreviewed ? 'draft' : blanks ? 'blanks' : 'done';
  return { k, blanks, drafts, hasContent, unreviewed, reviewed: reviewed ? { by: review.by, at: review.at } : null, stale, state };
}

/* Kort forklaring til prik og tooltip. Status må ikke kun vises med farve. */
function memoStatusText(st) {
  if (!st) return '';
  if (st.state === 'empty') return t('Ikke skrevet');
  const parts = [];
  if (st.stale) parts.push(t('Ændret efter gennemgang'));
  else if (st.state === 'draft') parts.push(t('Udkast, ikke gennemgået'));
  else if (st.reviewed) parts.push(t('Gennemgået'));
  else if (st.state === 'done') parts.push(t('Færdig'));
  if (st.blanks) parts.push(st.blanks + ' ' + (st.blanks === 1 ? t('felt mangler') : t('felter mangler')));
  return parts.join(' · ');
}

/**
 * Memoets samlede status. Bruges af klarhedstjekket før indstilling, også når
 * memoet ikke er vist, så den læser localStorage og skabelonen direkte.
 */
/** Kommentarer samlet: åbne, løste, blokerende pr. afsnit og i alt. */
/* frozen: kommentarsporet fra en indstillet version ({ [afsnit]: [...] }). Uden
   det tælles det levende spor, som klarhedstjekket bruger. */
function memoCommentCounts(frozen) {
  const out = { open: {}, all: {}, openTotal: 0, resolvedTotal: 0, withdrawnTotal: 0, allTotal: 0, blocking: 0, blockingList: [], resolvedList: [], openList: [] };
  MEMO_SECTIONS.forEach(s => {
    const list = frozen ? (frozen[s.k] || []) : loadComments(s.k);
    out.all[s.k] = list.length;
    out.allTotal += list.length;
    out.open[s.k] = 0;
    list.forEach(c => {
      const st = commentState(c);
      if (st === 'open') {
        out.open[s.k]++; out.openTotal++;
        // Alle åbne kommentarer, til kvitteringen ved indstilling (workspace)
        out.openList.push({ id: c.id, section: s.k, sectionName: s.num + '. ' + t(s.label), author: c.author, dept: t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept), text: t(c.text), blocking: isBlockingComment(c), at: c.at || null });
        if (isBlockingComment(c)) {
          out.blocking++;
          // awaiting: rådgiveren har svaret og bedt kontrolfunktionen om frigivelse
          out.blockingList.push({ id: c.id, section: s.k, sectionName: s.num + '. ' + t(s.label), author: c.author, dept: t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept), text: t(c.text), at: c.at || null,
            awaiting: !!c.release, releaseRequestedBy: c.release ? c.release.by : null, releaseRequestedAt: c.release ? c.release.at : null, reply: c.release ? c.release.text : null });
        }
      } else if (st === 'resolved') {
        out.resolvedTotal++;
        // Hvem, hvornår og hvorfor, til kvitteringen ved indstilling
        out.resolvedList.push({ id: c.id, section: s.k, sectionName: s.num + '. ' + t(s.label), author: c.author, dept: t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept),
          text: t(c.text), blocking: isBlockingComment(c), resolvedBy: c.resolved.by,
          resolvedByDept: c.resolved.dept ? t((MEMO_DEPT_MAP[c.resolved.dept] || {}).label || c.resolved.dept) : null,
          resolvedAt: c.resolved.at, reason: t(c.resolved.reason || ''), reply: c.release ? c.release.text : null });
      }
      else out.withdrawnTotal++;
    });
  });
  return out;
}

/* ── Tomme felter i tre grupper ──────────────────────────────────────────────
   Klarhedstjekket skal ikke kræve begrundelse for felter, som komitéen selv
   udfylder, og skal kunne samle rene skabelonrester under én begrundelse.
   - committee: udfyldes af kreditkomitéen ved påtegningen (hele afsnit 11)
   - template:  skabelonrester uden sagsindhold (tom tabelrække, "evt."-felter,
                vejledning til valg, der ikke er aktuelle)
   - caseData:  sagens data mangler faktisk
   Felterne genkendes på teksten (dansk eller engelsk) i skabelonens rækkefølge.
   Ukendte felter (fx skrevet af AI) regnes som manglende sagsdata.
   Rækker: [dansk tekst, engelsk tekst, gruppe, etiket]
   ──────────────────────────────────────────────────────────────────────────── */
const MEMO_BLANKS = {
  financing: [
    ['[tilføj række]', '[add row]', 'template', 'Tom række i finansieringstabellen'],
    ['0,0', '0.0', 'template', 'Tom række i finansieringstabellen'],
    ['%', '%', 'template', 'Tom række i finansieringstabellen'],
    ['[kapitalbehov]', '[capital requirement]', 'template', 'Tom række i finansieringstabellen'],
    ['0,0', '0.0', 'template', 'Tom række i finansieringstabellen'],
    ['[evt. supplerende bemærkninger]', '[any supplementary comments]', 'template', 'Supplerende bemærkninger (valgfrit)'],
  ],
  legal: [
    ['[indsæt vurderingen, eller begrund hvorfor Legal SME ikke er inddraget]', '[insert the assessment, or state why Legal SME has not been involved]', 'caseData', "Legal SME's vurdering"],
  ],
  conclusion: [
    ['2', '2', 'template', 'Henvisning til ESG-bilaget'],
  ],
  ownership: [
    ['[planer om generationsskifte]', '[succession plans]', 'caseData', 'Planer om generationsskifte'],
    ['[ikke dokumenteret i materialet]', '[not documented in the material]', 'caseData', 'Direktørens uddannelse og tidligere erfaring'],
    ['[evt. uddybning af bestyrelsesarbejdet]', "[optional elaboration on the board's work]", 'template', 'Uddybning af bestyrelsesarbejdet (valgfrit)'],
  ],
  market: [
    ['[væsentligste konkurrenter]', '[main competitors]', 'caseData', 'Væsentligste konkurrenter'],
  ],
  financial: [
    ['[beregnes af rådgiveren]', '[to be calculated by the adviser]', 'caseData', 'Gældsserviceringsgrad på normaliserede afdrag'],
  ],
  endorsement: [
    // auto: indstillingspåtegningen udfyldes ved indstilling (rådgiver og tidspunkt)
    ['[dato]', '[date]', 'auto', 'Dato for indstilling'],
    ['Kundechef', 'Relationship manager', 'committee', 'Indstillingsniveau'],
    ['[initialer]', '[initials]', 'auto', 'Indstillers initialer'],
    ['[Indstillers bemærkninger]', "[Recommender's comments]", 'committee', 'Indstillers bemærkninger'],
    ['[dato]', '[date]', 'committee', 'Dato for bevilling'],
    ['Kreditkomité', 'Credit committee', 'committee', 'Bevillingsinstans'],
    ['[initialer]', '[initials]', 'committee', 'Bevillingens initialer'],
    ['[Referat fra bevillingsmøde]', '[Minutes from approval meeting]', 'committee', 'Referat fra bevillingsmøde'],
  ],
  appendix1: [
    ['0,0', '0.0', 'caseData', 'Eksisterende engagement med EIFO'],
    ['[bekræftes i EIFOs engagementsoversigt]', "[to be confirmed in EIFO's exposure overview]", 'template', 'Note om EIFOs engagementsoversigt'],
    ['[eller angiv mandat]', '[or state mandate]', 'template', 'Tabsmandat'],
    ['[ja/nej]', '[yes/no]', 'template', 'Tjekliste for tabsmandat'],
    ['Maks. to linjer begrundelse for valg af "ingen tabsmandat", hvis kriterier for mandat er opfyldt', 'Max. two lines of justification for choosing "no loss mandate" if the criteria for a mandate are met', 'template', 'Begrundelse for ingen tabsmandat'],
    ['Maks. to linjer med begrundelse for afvigelse fra beregnet marginal/præmie', 'Max. two lines of justification for deviation from the calculated margin/premium', 'template', 'Begrundelse for afvigelse fra beregnet marginal og præmie'],
    ['[N/A, ikke grøn finansiering]', '[N/A, not green financing]', 'template', 'Grønne covenants'],
    ['[Formulering skal følge formuleringen i Særvilkårskataloget. Indfør vilkår her]', '[Wording must follow the wording in the Special Conditions Catalogue. Insert conditions here]', 'template', 'Fravigelser fra de Generelle vilkår'],
    ['[dato]', '[date]', 'caseData', 'Udbetalingsfrist'],
    ['1,0', '1.0', 'caseData', 'Overtræksret'],
  ],
  appendix2: [
    ['[øvrige politikker]', '[other policies]', 'template', 'Øvrige ESG-politikker'],
  ],
};
const MEMO_COMMITTEE_SECTIONS = ['endorsement'];
function _memoBlankNorm(x) { return String(x || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

/** Afsnittets tomme felter: [{ section, id, label, group, text, index }]. id er stabilt (afsnit:nr i skabelonen), index er placeringen i teksten. */
function memoBlankFields(k, html) {
  const d = document.createElement('div');
  d.innerHTML = html != null ? html : sectionHtml(k);
  const map = MEMO_BLANKS[k] || [];
  const committee = MEMO_COMMITTEE_SECTIONS.includes(k);
  const used = {};
  return Array.from(d.querySelectorAll('.tpl-blank')).map((el, i) => {
    const raw = (el.textContent || '').trim();
    const txt = _memoBlankNorm(raw);
    const j = map.findIndex((m, n) => !used[n] && (_memoBlankNorm(m[0]) === txt || _memoBlankNorm(m[1]) === txt));
    if (j >= 0) {
      used[j] = true;
      return { section: k, id: k + ':' + (j + 1), label: t(map[j][3]), group: map[j][2] === 'auto' ? 'auto' : committee ? 'committee' : map[j][2], text: raw, index: i };
    }
    return { section: k, id: k + ':x' + (i + 1), label: raw.replace(/^\[|\]$/g, '') || t('Tomt felt'), group: committee ? 'committee' : 'caseData', text: raw, index: i };
  });
}

function memoStatus() {
  const list = MEMO_SECTIONS.map(s => Object.assign({}, s, memoSectionStatus(s.k)));
  const cc = memoCommentCounts();
  // auto: udfyldes automatisk ved indstilling (indstillingspåtegningens dato og initialer)
  const blankGroups = { template: [], committee: [], caseData: [], auto: [] };
  MEMO_SECTIONS.forEach(s => memoBlankFields(s.k).forEach(f => {
    blankGroups[f.group].push({ section: f.section, sectionName: s.num + '. ' + t(s.label), id: f.id, label: f.label });
  }));
  return {
    sectionsTotal: list.length,
    sectionsDone: list.filter(x => x.state === 'done').length,
    // Afsnit rådgiveren aktivt har markeret som gennemgået
    reviewed: list.filter(x => !!x.reviewed).length,
    unreviewedDrafts: list.filter(x => x.unreviewed).length,
    blanks: list.reduce((n, x) => n + x.blanks, 0),
    // Uløste kommentarer (løste og trukne tilbage tæller ikke)
    openComments: cc.openTotal,
    // Uløste kommentarer fra Compliance eller Risiko, der kræver handling. Blokerer indstillingen.
    blockingComments: cc.blocking,
    blockingList: cc.blockingList,
    // Løste kommentarer med hvem, hvornår og hvorfor (resolvedBy, resolvedAt, reason)
    resolvedComments: cc.resolvedList,
    resolvedCount: cc.resolvedTotal,
    // Åbne kommentarer (også dem, der ikke blokerer) med afsnit, forfatter og tekst
    openList: cc.openList,
    withdrawnComments: cc.withdrawnTotal,
    // Tomme felter delt i skabelonrester, komitéens felter og manglende sagsdata
    blankGroups,
    needsWork: list.filter(x => x.state !== 'done').map(x => x.num + '. ' + t(x.label)),
    // Ekstra detaljer pr. afsnit til den der vil vise mere
    empty: list.filter(x => x.state === 'empty').length,
    sections: list.map(x => ({ k: x.k, name: x.num + '. ' + t(x.label), state: x.state, blanks: x.blanks,
      reviewedBy: x.reviewed ? x.reviewed.by : null, reviewedAt: x.reviewed ? x.reviewed.at : null,
      // Teksten er ændret efter gennemgangen, så den skal gennemgås igen
      changedAfterReview: !!x.stale })),
  };
}
window.CW_MEMO_STATUS = memoStatus;

/* Kørselsattributter på kildehenvisningerne (tastatur og skærmlæser) hører
   ikke til teksten. De fjernes, før teksten fryses eller eksporteres. */
function _memoStripRuntime(html) {
  if (!html || html.indexOf('memo-cite') < 0) return html || '';
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('.memo-cite').forEach(el => { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-label'); el.removeAttribute('data-nodoc'); });
  return d.innerHTML;
}

/**
 * Hele memoet som det står nu, på det aktive sprog: { [afsnit]: html }.
 * Virker også når memoet ikke er vist. Workspace giver det til CW.submit(),
 * så den indstillede version kan vises og eksporteres uændret bagefter.
 * `__lang` fortæller hvilket sprog versionen blev frosset på.
 */
function memoSnapshot() {
  const out = {};
  const review = {};
  MEMO_SECTIONS.forEach(s => {
    out[s.k] = _memoStripRuntime(sectionHtml(s.k));
    const st = memoSectionStatus(s.k);
    if (st.reviewed) review[s.k] = st.reviewed;
  });
  out.__lang = MEMO_EN ? 'en' : 'da';
  // Det komitéen får, fryses også: gennemgangen pr. afsnit, forsiden (memohoved
  // og "Indstillingen i hovedtræk") og de løste kommentarer med begrundelse
  out.__review = review;
  out.__front = memoFront();
  out.__resolved = memoCommentCounts().resolvedList;
  // Hele kommentarsporet fryses med, så den låste version viser det, komitéen fik
  out.__comments = MEMO_SECTIONS.reduce((m, s) => { m[s.k] = loadComments(s.k); return m; }, {});
  _memoSignEndorsement(out);
  return out;
}
window.CW_MEMO_SNAPSHOT = memoSnapshot;

/* Indstillingspåtegningen (afsnit 11) udfyldes ved indstilling med
   rådgiverens initialer og navn og tidspunktet. Bevillingspåtegningen er
   komitéens og forbliver tom. */
function _memoSignEndorsement(out) {
  const html = out.endorsement;
  if (!html) return;
  const d = document.createElement('div');
  d.innerHTML = html;
  const blanks = d.querySelectorAll('.tpl-blank');
  const fields = memoBlankFields('endorsement', html);
  const at = new Date().toISOString();
  const lang = out.__lang === 'en' ? 'en' : 'da';
  const fill = (id, text) => {
    const f = fields.find(x => x.id === id);
    const el = f ? blanks[f.index] : null;
    if (!el) return;
    const s = document.createElement('span');
    s.className = 'memo-signed';
    s.textContent = text;
    el.replaceWith(s);
  };
  fill('endorsement:1', _memoFmtLang(at, lang) + ' ' + _memoFmtLang(at, lang, true).split(' ').pop());
  fill('endorsement:3', _cmtInitials(MEMO_REVIEWER) + ' (' + MEMO_REVIEWER + ')');
  out.endorsement = d.innerHTML;
  out.__signed = { by: MEMO_REVIEWER, at };
}

/* Kvittering for indstillingen i Word-filen. For den gældende indstilling
   læses note og begrundelser fra sagen; en tidligere version har noten fra
   sagens historik. Frigivne blokeringer og kommentarer er frosset i versionen. */
function memoReceiptHtml(locked, esc, t, fmtWhen) {
  const secs = locked.sections || {};
  const cs = (window.CW && CW.caseState()) || {};
  const current = !locked.past;
  const hist = (cs.history || []).filter(h => h.type === 'submitted' && h.version === locked.version).slice(-1)[0] || {};
  const note = current ? cs.submitNote : hist.note;
  const none = esc(t('Ingen'));
  const li = (arr) => arr.length ? '<ul>' + arr.map(x => '<li>' + x + '</li>').join('') + '</ul>' : none;
  const rows = [];
  rows.push([t('Indstillet'), esc(t('Version') + ' ' + locked.version + ', ' + fmtWhen(locked.at) + (locked.by ? ', ' + locked.by : ''))]);
  rows.push([t('Note til kreditkomitéen'), note ? esc(note) : none]);
  if (current) {
    const reasons = Array.isArray(cs.submitReasons) ? cs.submitReasons : [];
    rows.push([t('Begrundelser'), li(reasons.map(r => esc(r.text || '') + '<br/>' + esc(t('Begrundelse')) + ': ' + esc(r.reason || '')))]);
  }
  const released = (Array.isArray(secs.__resolved) ? secs.__resolved : []).filter(x => x.blocking);
  rows.push([t('Frigivne blokeringer'), li(released.map(c => esc((c.sectionName ? c.sectionName + ': ' : '') + (c.text || '')) + '<br/>'
    + esc(_memoFill(t('Frigivet af {who} {when}'), { who: [c.resolvedBy, c.resolvedByDept].filter(Boolean).join(', '), when: c.resolvedAt ? fmtWhen(c.resolvedAt) : '' }))
    + (c.reason ? '. ' + esc(t('Begrundelse')) + ': ' + esc(c.reason) : '') + (c.reply ? '. ' + esc(t('Svar fra rådgiveren')) + ': ' + esc(c.reply) : '')))]);
  if (cs.skipReason) rows.push([t('Kundeinput sprunget over'), esc(t('Begrundelse')) + ': ' + esc(cs.skipReason)]);
  const open = [];
  const frozen = secs.__comments || {};
  MEMO_SECTIONS.forEach(s => (frozen[s.k] || []).forEach(c => {
    if (commentState(c) !== 'open') return;
    const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
    open.push(esc(s.num + '. ' + t(s.label) + ': ' + c.author + ' (' + t(d.label) + '), ' + fmtWhen(c.at)) + (isBlockingComment(c) ? ' <strong>' + esc(t('Blokerer indstilling')) + '</strong>' : '') + '<br/>' + esc(t(c.text)));
  }));
  rows.push([t('Åbne kommentarer'), li(open)]);
  return '<h2>' + esc(t('Kvittering for indstillingen')) + '</h2><table class="facts">'
    + rows.map(r => '<tr><td style="width:32%;color:#555;vertical-align:top;">' + esc(r[0]) + '</td><td style="vertical-align:top;">' + r[1] + '</td></tr>').join('') + '</table>';
}

/** Forsiden, som den vises ved indstilling. Indstillingsteksten mister "Udkast:". */
function memoFront() {
  const CO = (window.DATA && DATA.COMPANY) || {};
  return { company: CO.name || 'Nordhavn Composite A/S', cvr: CO.cvr || '', caseNr: CO.caseNr || '', risk: memoRisk(), facts: memoFacts({ final: true }) };
}

/* En bestemt indstillet version vist skrivebeskyttet (fra Sagens historik eller
   banneret): { version, compare }. null viser memoet som normalt. */
let _memoView = null;

/* Memoet er skrivebeskyttet når sagen er indstillet til kreditkomitéen */
function memoSubmittedAt() {
  try { return (window.CW && CW.caseState().submittedAt) || null; } catch (e) { return null; }
}

/** Den indstillede version: { at, version, sections, lang } eller null, når sagen ikke er indstillet. */
function memoLocked() {
  const at = memoSubmittedAt();
  const cs = (window.CW && CW.caseState()) || {};
  let snap = null;
  // En tidligere version, der er åbnet fra historikken
  if (_memoView) { try { snap = CW.memoSnapshot(_memoView.version); } catch (e) { snap = null; } }
  const viewing = !!snap;
  if (!snap) {
    if (!at) return null;
    try { snap = CW.memoSnapshot && CW.memoSnapshot(); } catch (e) { snap = null; }
  }
  const sections = snap && snap.sections ? snap.sections : null;
  const version = (snap && snap.version) || cs.submitVersion || 1;
  return {
    at: (snap && snap.at) || at,
    version,
    by: (snap && snap.by) || null,
    sections,
    lang: sections && sections.__lang ? sections.__lang : null,
    // Gennemgang og forside fra indstillingen. Ældre versioner uden dem viser det levende.
    review: sections && sections.__review ? sections.__review : null,
    front: sections && sections.__front ? sections.__front : null,
    // Ikke den gældende indstilling, men en tidligere version åbnet fra historikken
    past: viewing && !(at && version === cs.submitVersion),
    compare: viewing && !!_memoView.compare,
  };
}
/* Gennemgangen for et afsnit i den viste version. undefined: brug den levende. */
function memoLockedReview(locked, k) {
  if (!locked || !locked.sections || !locked.review) return undefined;
  return locked.review[k] || null;
}

/** yyyy-mm-dd (eller ISO) som "24. sep. 2026" / "24 Sep 2026" */
function _memoFmtDay(ymd) {
  if (!ymd) return '';
  const iso = String(ymd).length === 10 ? ymd + 'T00:00:00' : ymd;
  return window.CW ? CW.fmtDate(iso) : String(ymd);
}

/** Memoets dato: indstillingsdatoen, når det er indstillet, ellers sagens pr.-dato fra faktaarket. */
/* ── Dokumentets sprog ───────────────────────────────────────────────────────
   En indstillet version vises og eksporteres på det sprog, den blev indstillet
   på: forside, etiketter, afsnitstitler og tekst. Dansk er selve nøglen, så
   engelsk slås op i ordbogen, og dansk er teksten selv. */
function _memoTL(lang, s) {
  if (lang !== 'en') return s;
  const d = window.I18N && window.I18N.en;
  return d && Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s;
}
const _MEMO_MONTHS = { da: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
/** Dato (og evt. tid) på et bestemt sprog, i samme form som CW.fmtDate / CW.fmtWhen */
function _memoFmtLang(ymd, lang, withTime) {
  if (!ymd) return '';
  const d = new Date(String(ymd).length === 10 ? ymd + 'T00:00:00' : ymd);
  if (isNaN(d)) return String(ymd);
  const m = _MEMO_MONTHS[lang === 'en' ? 'en' : 'da'][d.getMonth()];
  const pad = (n) => (n < 10 ? '0' : '') + n;
  if (lang !== 'en') {
    const dmy = pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
    return withTime ? dmy + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : dmy;
  }
  const day = d.getDate() + ' ' + m;
  return withTime ? day + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : day + ' ' + d.getFullYear();
}

function memoDate(locked, lang) {
  if (locked && locked.at) return lang && lang !== (MEMO_EN ? 'en' : 'da') ? _memoFmtLang(locked.at, lang) : _memoFmtDay(locked.at);
  const f = window.CASE_FACTS || {};
  return _memoFmtDay(f.asOf || new Date().toISOString());
}

/* ── Indstillingen i hovedtræk (side 1) ──────────────────────────────────────
   Genereres af faktaarket (window.CASE_FACTS), så side 1, beslutningspanelet
   og klarhedstjekket ikke kan blive uenige. Tåler at felter er null.
   Rækker: { k, label, value (tekst) | items [{ text, tag, tone }], source }
   ──────────────────────────────────────────────────────────────────────────── */
function _memoAmt(kr) {
  if (kr == null || kr === '') return null;
  if (typeof kr === 'string') return kr;
  if (window.DATA && DATA.fmt && DATA.fmt.amount) return DATA.fmt.amount(kr);
  return 'DKK ' + (kr / 1e6).toFixed(1).replace('.', ',') + ' mio.';
}
function _memoPct(x) {
  if (x == null || x === '') return null;
  const v = x <= 1 ? x * 100 : x;
  const s = (Math.round(v * 10) / 10).toLocaleString(MEMO_EN ? 'en-GB' : 'da-DK');
  return MEMO_EN ? s + '%' : s + ' %';
}
function _memoTxt(x) { return x == null || x === '' ? null : (typeof x === 'object' && x.text ? _memoF(x, 'text') : t(String(x))); }
/* Faktaarket har engelske felter med suffikset En (text/textEn). Mangler den
   engelske, bruges ordbogen. */
function _memoF(o, k) {
  if (!o) return null;
  if (MEMO_EN && o[k + 'En'] != null && o[k + 'En'] !== '') return String(o[k + 'En']);
  const v = o[k];
  return v == null || v === '' ? null : t(String(v));
}

/* opts.final: forsiden til indstilling. "Udkast:" foran indstillingen fjernes. */
function memoFacts(opts) {
  const final = !!(opts && opts.final);
  const F = window.CASE_FACTS && typeof window.CASE_FACTS === 'object' ? window.CASE_FACTS : {};
  const fac = F.facility || {};
  // Kilde pr. række: den side, hvor oplysningen står (faktaarkets facility.refs)
  const facRef = (k) => (fac.refs && fac.refs[k]) || fac.source;
  const rows = [];
  const join = (parts, sep) => parts.filter(Boolean).join(sep || ' · ') || null;
  const isMet = (c) => /opfyldt|met|done/i.test((c && c.status) || '');

  rows.push({ k: 'facility', label: t('Facilitet'),
    // "EIFO-eksportkaution · Revolverende produktions- og eksportkredit i Nordjyske Bank, DKK 4,5 mio."
    value: join([_memoF(fac, 'instrument'),
      join([_memoF(fac, 'facilityType') || (fac.bank ? t('Facilitet') + ' ' + t('hos') + ' ' + fac.bank : null), _memoAmt(fac.facilityAmount)], ', ')]),
    source: facRef('facility') });
  rows.push({ k: 'eifo', label: t('EIFO-andel og beløb'),
    value: join([_memoPct(fac.eifoShare), _memoAmt(fac.eifoAmount)]), num: true, source: facRef('eifo') });
  const period = fac.start || fac.end ? [_memoFmtDay(fac.start), _memoFmtDay(fac.end)].filter(Boolean).join(' ' + t('til') + ' ') : null;
  rows.push({ k: 'tenor', label: t('Løbetid'),
    value: join([fac.tenorMonths ? fac.tenorMonths + ' ' + t('mdr.') : null, period ? '(' + period + ')' : null], ' '), source: facRef('tenor') });
  rows.push({ k: 'ranking', label: t('Prioritet'), value: _memoF(fac, 'ranking'), source: facRef('ranking') });
  rows.push({ k: 'pricing', label: t('Pris og præmie'),
    value: join([fac.pricing ? t('Rente') + ' ' + _memoF(fac, 'pricing') : null, fac.premium ? t('Præmie') + ' ' + _memoF(fac, 'premium') : null]), source: facRef('pricing') });

  const conds = (Array.isArray(F.conditions) ? F.conditions : []).filter(Boolean);
  const met = conds.filter(isMet).length;
  rows.push({ k: 'conditions', label: t('Betingelser før udbetaling'),
    summary: conds.length ? conds.length + ' ' + (conds.length === 1 ? t('betingelse') : t('betingelser')) + ', ' + met + ' ' + t('opfyldt') + ', ' + (conds.length - met) + ' ' + memoOpenWord(conds.length - met) : null,
    // Kun opfyldte betingelser får et mærke (gråt "· opfyldt"); åbne står uden
    items: conds.map(c => ({ id: c.id, text: _memoF(c, 'text'), claimDa: c.text ? (c.id ? c.id + ' ' : '') + c.text : null, tag: isMet(c) ? t('opfyldt') : null, tone: isMet(c) ? 'ok' : 'open', source: c.source })) });
  const covs = (Array.isArray(F.covenants) ? F.covenants : []).filter(Boolean);
  rows.push({ k: 'covenants', label: t('Covenants'), items: covs.map(c => ({ id: c.id, text: _memoF(c, 'text'), claimDa: c.text ? (c.id ? c.id + ' ' : '') + c.text : null, source: c.source })) });
  // Alle røde flag med høj vægt. Resten nævnes som "+n flere" (afsnit 5).
  // Kildeviseren kontrollerer flagets fulde tekst (claim), ikke den korte.
  const allFlags = (Array.isArray(F.redFlags) ? F.redFlags : []).filter(Boolean);
  const highFlags = allFlags.filter(f => f.severity === 'høj');
  const flags = highFlags.length ? highFlags : allFlags.slice(0, 3);
  rows.push({ k: 'flags', label: t('Vigtigste røde flag'), more: allFlags.length - flags.length, moreJump: 'risk',
    // Vægten står i rækkens overskrift og i "+n med middel vægt", ikke på hvert flag
    items: flags.map(f => ({ text: _memoF(f, 'short') || _memoF(f, 'text'), claim: _memoF(f, 'text'), claimDa: f.text || null, tone: f.severity === 'høj' ? 'hoj' : 'open', source: f.source })) });
  const rec = F.recommendation;
  if (rec && typeof rec === 'object' && (rec.risk || rec.rating)) {
    rows.push({ k: 'risk', label: t('Risiko og rating'),
      value: join([_memoF(rec, 'risk') ? t('Samlet risiko') + ' ' + _memoF(rec, 'risk') : null,
        rec.rating ? 'Rating ' + rec.rating + (rec.ratingModel && rec.ratingModel !== rec.rating ? ' (' + t('modellen giver') + ' ' + rec.ratingModel + ')' : '') : null]), source: rec.ratingSource });
  }
  let recText = rec ? (typeof rec === 'object' ? _memoF(rec, 'text') : t(String(rec))) : null;
  if (recText && final) {
    recText = recText.replace(/^\s*(Udkast|Draft)\s*:\s*/i, '');
    recText = recText.charAt(0).toUpperCase() + recText.slice(1);
  }
  rows.push({ k: 'rec', label: t('Kreditindstilling'), value: recText, source: rec && rec.source, fallback: t('Se afsnit 6, Konklusion og indstilling.'), jump: 'conclusion' });
  // Kilderne er danske. På engelsk kontrollerer kildeviseren rækkens danske
  // udgave, bygget af faktaarkets danske felter.
  const daAmt = (kr) => kr == null || kr === '' ? null : typeof kr === 'string' ? kr : 'DKK ' + (kr / 1e6).toFixed(1).replace('.', ',') + ' mio.';
  const daPct = (x) => x == null || x === '' ? null : String(Math.round((x <= 1 ? x * 100 : x) * 10) / 10).replace('.', ',') + ' %';
  const daRow = {
    facility: join([fac.instrument, join([fac.facilityType, daAmt(fac.facilityAmount)], ', ')]),
    eifo: join([daPct(fac.eifoShare), daAmt(fac.eifoAmount)]),
    tenor: join([fac.tenorMonths ? fac.tenorMonths + ' mdr.' : null, fac.start || fac.end ? '(' + [fac.start, fac.end].filter(Boolean).join(' til ') + ')' : null], ' '),
    ranking: fac.ranking || null,
    pricing: join([fac.pricing ? 'Rente ' + fac.pricing : null, fac.premium ? 'Præmie ' + fac.premium : null]),
    risk: rec && typeof rec === 'object' ? join([rec.risk ? 'Samlet risiko ' + rec.risk : null, rec.rating ? 'Rating ' + rec.rating : null]) : null,
    rec: rec && typeof rec === 'object' ? rec.text || null : null,
  };
  // En værdirække er én påstand: hele værdien, ikke kun sætningen foran henvisningen
  rows.forEach(r => { if (!r.items && r.value) { r.claim = r.value; if (daRow[r.k]) r.claimDa = daRow[r.k]; } });
  return rows;
}

/** Sidehenvisning på det aktive sprog: "s. 5" / "p. 5", "ark Kunder" / "sheet Kunder".
    Kun visningen; data-page i teksten er uændret. */
function memoRefLabel(ref, lang) {
  if (!ref) return '';
  // lang: dokumentets sprog, når en indstillet version vises på et andet sprog
  const en = lang ? lang === 'en' : MEMO_EN;
  // "S5" er dokument 5 i sikkerhedsmappen og skal ikke forveksles med "s. 5"
  if (/^S\d+$/.test(String(ref))) return (en ? 'doc. ' : 'dok. ') + ref;
  if (!en) return String(ref);
  return String(ref)
    .replace(/(^|[\s,(])s\.\s?(\d)/g, '$1p. $2')
    .replace(/(^|[\s,(])ark\s/g, '$1sheet ')
    .replace(/(^|[\s,(])linje\s/g, '$1line ')
    .replace(/(^|[\s,(])bemærkning\s/g, '$1remark ');
}

/** Samlet kreditrisiko til memoets hoved: fra faktaarket, ellers skabelonens "Middel/Høj" */
function memoRisk() {
  const rec = window.CASE_FACTS && window.CASE_FACTS.recommendation;
  return (rec && typeof rec === 'object' && _memoF(rec, 'risk')) || t('Middel/Høj');
}

/** Kilde { doc, ref } som kort tekst: "Ansøgning, s. 1" */
function _memoSrcLabel(src, lang) {
  if (!src || !src.doc) return null;
  const d = (window.CASE_DOCS || []).find(x => x.name === src.doc);
  return (d ? (lang ? _memoTL(lang, d.type) : t(d.type)) : src.doc) + (src.ref ? ', ' + memoRefLabel(src.ref, lang) : '');
}

/* Kildehenvisning i indstillingsboksen: samme klikbare henvisning som i teksten */
// "1 åben", "2 åbne"
function memoOpenWord(n) { return n === 1 ? t('åben') : t('åbne'); }

function MemoFactSrc({ src, claim, claimDa, lang }) {
  const lbl = _memoSrcLabel(src, lang);
  if (!lbl) return null;
  return (
    <span className="src"> · <span className="memo-cite" data-doc={src.doc} data-page={src.ref || ''}
      role={window.CW_SOURCE_VIEW === true ? 'button' : undefined} tabIndex={window.CW_SOURCE_VIEW === true ? 0 : undefined}
      data-claim={claim || undefined} data-claim-da={MEMO_EN && claimDa ? claimDa : undefined}
      aria-label={window.CW_SOURCE_VIEW === true ? memoCiteName(lbl, src.doc, src.ref) : undefined}>{lbl}</span></span>
  );
}

/* Side 1: facilitet, EIFO-andel, løbetid, prioritet, pris, betingelser,
   covenants, røde flag og indstilling på ét sted. Ikke et redigerbart afsnit. */
function MemoFactsBox({ onJump, rows, lang }) {
  rows = rows || memoFacts();
  // lang: den frosne forside vises på det sprog, den blev indstillet på
  const t = (s) => (lang ? _memoTL(lang, s) : window.t(s));
  const empty = <span className="muted">{t('Ikke udfyldt i faktaarket')}</span>;
  return (
    <>
      <h2 id="memo-facts-h" style={{ margin: '18px 0 0', fontSize: 12, fontWeight: 500, color: 'var(--c-text-2)' }}>{t('Indstillingen i hovedtræk')}</h2>
      <table className="memo-facts" aria-labelledby="memo-facts-h">
        <tbody>
          {rows.map(r => (
            <tr key={r.k}>
              <th scope="row">{r.label}</th>
              <td>
                {r.items ? (
                  r.items.length ? (
                    <>
                      {r.summary && <div style={{ marginBottom: 3 }}>{r.summary}</div>}
                      <ul>
                        {r.items.map((it, i) => (
                          <li key={i}>
                            {it.id && <b style={{ fontWeight: 600, marginRight: 5 }}>{it.id}</b>}
                            {it.text || empty}
                            {/* Kun "opfyldt" vises, i gråt. Frosne forsider fra før kan have
                                "Åben" og "Høj" i tag; de vises ikke længere. */}
                            {it.tone === 'ok' && <span className="st"> · {t('opfyldt')}</span>}
                            <MemoFactSrc src={it.source} claim={it.claim || ((it.id ? it.id + ' ' : '') + (it.text || ''))} claimDa={it.claimDa} lang={lang}/>
                          </li>
                        ))}
                      </ul>
                      {r.more > 0 && (onJump
                        ? <button type="button" className="memo-cmt-act primary" style={{ fontSize: 12, marginTop: 3 }} onClick={() => onJump(r.moreJump || 'risk')}>{'+' + r.more + ' ' + t('med middel vægt i afsnit 5')}</button>
                        : <div style={{ marginTop: 3, color: 'var(--c-text-2)' }}>{'+' + r.more + ' ' + t('med middel vægt i afsnit 5')}</div>)}
                    </>
                  ) : empty
                ) : r.value ? (
                  <><span className={r.num ? 'nw' : undefined}>{r.value}</span><MemoFactSrc src={r.source} claim={r.claim} claimDa={r.claimDa} lang={lang}/></>
                ) : r.fallback ? (
                  r.jump && onJump
                    ? <button type="button" className="memo-cmt-act primary" style={{ fontSize: 12 }} onClick={() => onJump(r.jump)}>{r.fallback}</button>
                    : <span style={{ color: 'var(--c-text-2)' }}>{r.fallback}</span>
                ) : empty}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* Samme boks til Word-eksporten */
function memoFactsHtml(esc, factRows, lang) {
  const t = (s) => (lang ? _memoTL(lang, s) : window.t(s));
  const src = (s) => (s && s.doc ? ' <span class="cite-ref">[' + esc(s.doc) + (s.ref ? ', ' + esc(memoRefLabel(s.ref, lang)) : '') + ']</span>' : '');
  const none = '<span class="blank">[' + esc(t('ikke udfyldt')) + ']</span>';
  const rows = (factRows || memoFacts()).map(r => {
    let v;
    if (r.items) {
      v = r.items.length
        ? (r.summary ? esc(r.summary) + '<br/>' : '') + r.items.map(it => '&bull; ' + (it.id ? '<strong>' + esc(it.id) + '</strong> ' : '') + (it.text ? esc(it.text) : none) + (it.tone === 'ok' ? ' <span style="color:#555;">&middot; ' + esc(t('opfyldt')) + '</span>' : '') + src(it.source)).join('<br/>')
          + (r.more > 0 ? '<br/>+' + r.more + ' ' + esc(t('med middel vægt i afsnit 5')) : '')
        : none;
    } else v = r.value ? esc(r.value) + src(r.source) : r.fallback ? esc(r.fallback) : none;
    return '<tr><td style="width:32%;color:#555;vertical-align:top;">' + esc(r.label) + '</td><td style="vertical-align:top;">' + v + '</td></tr>';
  });
  return '<h2>' + esc(t('Indstillingen i hovedtræk')) + '</h2><table class="facts">' + rows.join('') + '</table>';
}

/* Skuffen med kommentarer på smalle skærme. Den lægger sig over kanten af
   dokumentet under sagens faner, så man kan læse videre ved siden af.
   Esc lukker, og fokus går tilbage til knappen. */
function MemoDrawer({ onClose, children }) {
  const ref = React.useRef(null);
  const [top, setTop] = React.useState(120);
  React.useEffect(() => {
    const root = document.querySelector('.scroll');
    const place = () => { if (root) setTop(Math.round(root.getBoundingClientRect().top)); };
    place();
    window.addEventListener('resize', place);
    const onKey = (e) => { if (e.key === 'Escape' && ref.current && ref.current.contains(document.activeElement)) { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKey);
    const id = setTimeout(() => {
      const f = ref.current && ref.current.querySelector('button, textarea, [tabindex="0"]');
      if (f) f.focus();
    }, 30);
    return () => { window.removeEventListener('resize', place); document.removeEventListener('keydown', onKey); clearTimeout(id); };
  }, []);
  // Portal til body, så skuffen ligger over den faste værktøjslinje
  return ReactDOM.createPortal(
    <div ref={ref} id="memo-drawer" className="memo-drawer" role="complementary" aria-label={t('Kommentarer')} style={{ top }}>
      {children}
    </div>,
    document.body
  );
}

/* ── SectionDot ───────────────────────────────────────────────────────────── */
function SectionDot({ st }) {
  const state = st ? st.state : 'empty';
  const glyph = { done: '✓', blanks: '!', draft: '', empty: '' }[state];
  return <span className={'memo-dot ' + state} aria-hidden="true">{glyph}</span>;
}

/* ── MemoToolbar ──────────────────────────────────────────────────────────── */
/* Markeringen i memoet huskes, så værktøjslinjen kan bruges med tastaturet:
   når fokus flytter til en knap, lægges markeringen tilbage før kommandoen. */
function _memoRememberSelection() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.anchorNode) return;
  const n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
  const body = n && n.closest ? n.closest('.memo-body[contenteditable="true"]') : null;
  if (!body) return;
  _memoLastRange = sel.getRangeAt(0).cloneRange();
  _memoLastEditable = body;
}
function _memoRestoreSelection() {
  const ed = _memoLastEditable;
  if (!ed || !document.contains(ed)) return false;
  if (document.activeElement !== ed) ed.focus({ preventScroll: true });
  if (_memoLastRange && ed.contains(_memoLastRange.commonAncestorContainer)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_memoLastRange);
  }
  return true;
}

function MemoToolbar({ focusedKey, onReset, onOpenCitePicker, citeOpen }) {
  const [fmt, setFmt] = React.useState({ bold: false, italic: false, block: '', ul: false, ol: false });
  const [focusIdx, setFocusIdx] = React.useState(0);
  const barRef = React.useRef(null);

  React.useEffect(() => {
    const update = () => {
      _memoRememberSelection();
      // Knapperne viser formatet der, hvor markøren sidst stod i memoet
      const a = document.activeElement;
      if (!a || !a.closest || !a.closest('.memo-body')) return;
      try {
        const block = document.queryCommandValue('formatBlock').toLowerCase().replace(/[<>]/g, '');
        setFmt({
          bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), block,
          ul: document.queryCommandState('insertUnorderedList'), ol: document.queryCommandState('insertOrderedList'),
        });
      } catch (e) {}
    };
    document.addEventListener('selectionchange', update);
    // Alt+F10 flytter fokus fra teksten til værktøjslinjen, som i andre editorer
    const onKey = (e) => {
      if (e.altKey && e.key === 'F10' && barRef.current) {
        e.preventDefault();
        const b = barRef.current.querySelector('button[tabindex="0"]') || barRef.current.querySelector('button');
        if (b) b.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('selectionchange', update); document.removeEventListener('keydown', onKey); };
  }, []);

  /* Kommandoen køres på den huskede markering. Med musen bliver fokus i
     teksten (mousedown forhindres). Med tastaturet går fokus tilbage til
     knappen bagefter, så man kan fortsætte i værktøjslinjen. */
  function run(e, fn) {
    const viaKeyboard = e && e.detail === 0;
    const btn = e && e.currentTarget;
    if (!_memoRestoreSelection()) {
      CW.toast(t('Klik først i teksten, der skal formateres.'), { tone: 'info' });
      return;
    }
    fn(); // execCommand sender selv et input-event, så afsnittet gemmes
    _memoRememberSelection();
    if (viaKeyboard && btn) setTimeout(() => btn.focus(), 0);
  }
  function cmd(command, value) { document.execCommand(command, false, value || null); }

  function insertTable() {
    cmd('insertHTML', `<table><thead><tr><th>${t('Kolonne')} 1</th><th>${t('Kolonne')} 2</th><th style="text-align:right">${t('Kolonne')} 3</th></tr></thead><tbody><tr><td>&#8203;</td><td>&#8203;</td><td>&#8203;</td></tr><tr><td>&#8203;</td><td>&#8203;</td><td>&#8203;</td></tr></tbody></table><p><br></p>`);
  }

  // Fed og kursiv hedder F og K på dansk, B og I på engelsk
  const BOLD = MEMO_EN ? 'B' : 'F';
  const ITAL = MEMO_EN ? 'I' : 'K';
  const blockIs = (b) => fmt.block === b;
  const items = [
    { k: 'b', ch: <b>{BOLD}</b>, label: t('Fed'), keys: 'Control+B', short: 'Ctrl+B', pressed: fmt.bold, fn: () => cmd('bold') },
    { k: 'i', ch: <i style={{ fontStyle: 'italic' }}>{ITAL}</i>, label: t('Kursiv'), keys: 'Control+I', short: 'Ctrl+I', pressed: fmt.italic, fn: () => cmd('italic') },
    { sep: true },
    { k: 'p', ch: '¶', label: t('Normal tekst'), pressed: blockIs('p') || blockIs('div') || blockIs(''), fn: () => cmd('formatBlock', 'p') },
    { k: 'h2', ch: 'H2', wide: true, label: t('Overskrift 2'), pressed: blockIs('h2'), fn: () => cmd('formatBlock', blockIs('h2') ? 'p' : 'h2') },
    { k: 'h3', ch: 'H3', wide: true, label: t('Overskrift 3'), pressed: blockIs('h3'), fn: () => cmd('formatBlock', blockIs('h3') ? 'p' : 'h3') },
    { sep: true },
    { k: 'q', ch: '❝', label: t('Citat'), pressed: blockIs('blockquote'), fn: () => cmd('formatBlock', blockIs('blockquote') ? 'p' : 'blockquote') },
    { sep: true },
    { k: 'ul', ch: '•', label: t('Punktliste'), pressed: fmt.ul, fn: () => cmd('insertUnorderedList') },
    { k: 'ol', ch: '1.', wide: true, label: t('Nummerliste'), pressed: fmt.ol, fn: () => cmd('insertOrderedList') },
    { k: 'tbl', ch: '⊞', label: t('Tabel'), title: t('Indsæt tabel (2 rækker × 3 kolonner)'), fn: insertTable },
    { sep: true },
    { k: 'undo', ch: '↩', label: t('Fortryd'), keys: 'Control+Z', short: 'Ctrl+Z', fn: () => cmd('undo') },
    { k: 'redo', ch: '↪', label: t('Annullér fortryd'), keys: 'Control+Y', short: 'Ctrl+Y', fn: () => cmd('redo') },
  ];
  let bi = -1;

  // Piletaster flytter mellem knapperne; værktøjslinjen er ét tabulatorstop
  function onBarKey(e) {
    const btns = Array.from(barRef.current.querySelectorAll('button'));
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % btns.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + btns.length) % btns.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = btns.length - 1;
    else if (e.key === 'Escape') { e.preventDefault(); _memoRestoreSelection(); return; }
    if (n == null) return;
    e.preventDefault();
    setFocusIdx(n);
    btns[n].focus();
  }

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
    <div
      ref={barRef}
      role="toolbar"
      aria-label={t('Formatering af memoet')}
      aria-keyshortcuts="Alt+F10"
      onKeyDown={onBarKey}
      style={{
        display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
        padding: '7px 14px', borderBottom: '1px solid var(--c-line-2)',
        background: 'var(--c-surface)',
      }}>
      {items.map((it, i) => {
        if (it.sep) return <div key={'s' + i} className="memo-tb-sep" aria-hidden="true"/>;
        bi++;
        const my = bi;
        return (
          <button
            key={it.k}
            type="button"
            className={'memo-tb' + (it.pressed ? ' on' : '')}
            tabIndex={my === focusIdx ? 0 : -1}
            aria-label={it.label}
            aria-pressed={it.pressed === undefined ? undefined : !!it.pressed}
            aria-keyshortcuts={it.keys}
            title={(it.title || it.label) + (it.short ? ' (' + it.short + ')' : '')}
            onMouseDown={e => e.preventDefault()}
            onFocus={() => setFocusIdx(my)}
            onClick={e => run(e, it.fn)}
            style={{ fontSize: it.wide ? 11 : 13, minWidth: it.wide ? 32 : 26 }}
          >{it.ch}</button>
        );
      })}
      <div className="memo-tb-sep" aria-hidden="true"/>
      <button
        type="button"
        className={'memo-tb' + (citeOpen ? ' on' : '')}
        tabIndex={focusIdx === bi + 1 ? 0 : -1}
        onFocus={() => setFocusIdx(bi + 1)}
        aria-haspopup="listbox"
        aria-expanded={!!citeOpen}
        title={t('Indsæt kildereference fra dokumenter i sagen')}
        style={{ fontSize: 11, minWidth: 52 }}
        onMouseDown={e => e.preventDefault()}
        onClick={e => {
          _memoRememberSelection();
          const rect = e.currentTarget.getBoundingClientRect();
          onOpenCitePicker({ top: rect.bottom + 6, left: rect.left });
        }}
      >{t('@ Kilde')}</button>
      {focusedKey && (
        <>
          <div className="memo-tb-sep" aria-hidden="true"/>
          <span style={{ fontSize: 12, color: 'var(--c-text-3)', margin: '0 4px' }}>{t('Redigeret')}</span>
          <button
            type="button"
            className="memo-tb"
            tabIndex={focusIdx === bi + 2 ? 0 : -1}
            onFocus={() => setFocusIdx(bi + 2)}
            style={{ fontSize: 11, color: 'var(--c-text-2)' }}
            title={t('Nulstil afsnittet til skabelonens udkast')}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onReset(focusedKey)}
          >{t('Nulstil afsnit')}</button>
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
/* Ét kort i sporet. Åbne kommentarer vises helt; løste og trukne tilbage
   foldes sammen til én linje, der kan foldes ud. */
function MemoComment({ c, section, onResolve, onWithdraw, onRequest, onSimulate, lockNote }) {
  const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
  const state = commentState(c);
  const blocking = isBlockingComment(c);
  const [open, setOpen] = React.useState(false);
  const domId = 'cmt-' + section.k + '-' + c.id;
  const fmt = (iso) => (window.CW ? CW.fmtWhen(iso) : iso);
  const head = (
    <div className="memo-cmt-meta">
      <b>{c.author}</b>
      <span className="memo-cmt-dept">· {t(d.label)}</span>
      {blocking && state === 'open' && <span className="memo-cmt-flag">{t('Blokerer indstilling')}</span>}
      {blocking && state === 'open' && c.release && c.author !== MEMO_ME.author && <span className="memo-cmt-wait">{_memoFill(t('Afventer {dept}'), { dept: t(d.label) })}</span>}
    </div>
  );
  // Rådgiverens svar, da hun bad kontrolfunktionen om frigivelse
  const reply = c.release ? (
    <div className="memo-cmt-reason">
      <b style={{ fontWeight: 600 }}>{t('Svar fra')} {c.release.by}:</b> {t(c.release.text)}
      <div className="memo-cmt-time" style={{ marginTop: 2 }}>{t('Bad om frigivelse')} {fmt(c.release.at)}</div>
    </div>
  ) : null;
  if (state !== 'open') {
    const who = state === 'resolved' ? c.resolved.by : c.withdrawn.by;
    const when = state === 'resolved' ? c.resolved.at : c.withdrawn.at;
    // Frigivet: kontrolfunktionen har selv løst sin blokerende kommentar
    const released = state === 'resolved' && !!c.resolved.dept;
    const summary = (state === 'resolved' ? (released ? t('Frigivet af') + ' ' + who + ' (' + t((MEMO_DEPT_MAP[c.resolved.dept] || {}).label || c.resolved.dept) + ')' : t('Løst af') + ' ' + who) : t('Trukket tilbage af') + ' ' + who) + ', ' + fmt(when);
    return (
      <div className={'memo-cmt ' + state} data-cmt={domId}>
        <div className="memo-cmt-body">
          <button type="button" className="memo-cmt-sum" aria-expanded={open} onClick={() => setOpen(v => !v)}>
            <span aria-hidden="true" style={{ color: 'var(--c-text-3)' }}>{state === 'resolved' ? '✓' : '↺'}</span>
            <span className="memo-cmt-sum-t" style={{ flex: 1 }}>{summary}</span>
            <span aria-hidden="true" style={{ fontSize: 9, color: 'var(--c-text-4)' }}>{open ? '▴' : '▾'}</span>
          </button>
          {!open && (
            <div className="memo-cmt-time" style={{ marginTop: 2 }}>
              {c.author} · {t(d.label)}{blocking ? ' · ' + t('var blokerende') : ''}
            </div>
          )}
          {open && (
            <div style={{ marginTop: 6 }}>
              {head}
              <div className="memo-cmt-time">{commentWhen(c)}</div>
              <div className="memo-cmt-text" style={{ marginTop: 4, color: state === 'withdrawn' ? 'var(--c-text-3)' : undefined }}>{t(c.text)}</div>
              {reply}
              {state === 'resolved' && c.resolved.reason && (
                <div className="memo-cmt-reason"><b style={{ fontWeight: 600 }}>{t('Begrundelse')}{released ? ' (' + c.resolved.by + ')' : ''}:</b> {t(c.resolved.reason)}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  const mine = c.author === MEMO_ME.author;
  // En blokerende kommentar fra en kontrolfunktion kan kun frigives af den selv.
  // Rådgiveren svarer og beder om frigivelse.
  const control = blocking && !mine;
  const pending = !!_memoReleasePending[section.k + ':' + c.id];
  const deptLbl = t(d.label);
  return (
    <div className={'memo-cmt' + (blocking ? ' blocking' : '')} data-cmt={domId}>
      <div className="memo-cmt-body">
        {head}
        <div className="memo-cmt-time">{commentWhen(c)}</div>
        <div className="memo-cmt-text" style={{ marginTop: 4 }}>{t(c.text)}</div>
        {reply}
        {/* Indstillet: sporet er frosset. Intet kan løses, besvares eller trækkes tilbage. */}
        {lockNote ? (
          <div className="memo-cmt-actions"><span className="memo-cmt-time">{lockNote}</span></div>
        ) : (
        <div className="memo-cmt-actions" role={control && c.release ? 'status' : undefined}>
          {!control && (
            <button type="button" className="memo-cmt-act primary" onClick={() => onResolve(c)}
              aria-label={t('Løs kommentar fra') + ' ' + c.author}>{t('Løs')}</button>
          )}
          {control && !c.release && (
            <button type="button" className="memo-cmt-act primary" onClick={() => onRequest && onRequest(c)}
              aria-label={t('Svar og bed om frigivelse fra') + ' ' + c.author}>{t('Bed om frigivelse')}</button>
          )}
          {control && c.release && (pending
            ? <span className="memo-cmt-time">{c.author} {t('skriver et svar')}…</span>
            : <button type="button" className="memo-cmt-act primary" style={{ textAlign: 'left' }} onClick={() => onSimulate && onSimulate(c)}>
                {t('Simulér svar fra')} {c.author} ({deptLbl})
              </button>
          )}
          {mine && (
            <button type="button" className="memo-cmt-act" onClick={() => onWithdraw(c)}
              aria-label={t('Træk din kommentar tilbage')}>{t('Træk tilbage')}</button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

/* Kommentarsporet kan ikke ændres, mens sagen er indstillet */
function _memoCommentsLocked() {
  if (!memoSubmittedAt()) return false;
  if (window.CW) CW.toast(t('Sagen er indstillet. Træk indstillingen tilbage for at ændre kommentarerne.'), { tone: 'warn' });
  return true;
}

/* Løser en kommentar med hvem, hvornår og hvorfor. En blokerende kommentar
   fra en kontrolfunktion logges også i sagens historik. */
function resolveMemoComment(sKey, c, sectionName) {
  const blocking = isBlockingComment(c);
  // Funktionsadskillelse: en kontrolfunktions blokering frigives kun af den selv
  if (blocking && c.author !== MEMO_ME.author) return Promise.resolve(false);
  if (_memoCommentsLocked()) return Promise.resolve(false);
  return CW.confirm({
    title: blocking ? t('Løs blokerende kommentar') : t('Løs kommentar'),
    text: blocking
      ? c.author + ' (' + t((MEMO_DEPT_MAP[c.dept] || {}).label || '') + ') ' + t('har markeret, at indstillingen ikke kan godkendes uden handling. Skriv hvad der er gjort. Begrundelsen logges i sagens historik.')
      : t('Skriv kort, hvad der er gjort. Kommentaren foldes sammen, men bliver i sporet.'),
    requireReason: true,
    reasonLabel: t('Begrundelse'),
    confirmLabel: t('Løs'),
  }).then(r => {
    if (!r.ok) return false;
    const list = loadComments(sKey).map(x => x.id === c.id
      ? Object.assign({}, x, { resolved: { by: MEMO_ME.author, at: new Date().toISOString(), reason: r.reason } }) : x);
    saveComments(sKey, list);
    if (blocking && window.CW) {
      CW.log('comment-resolved', t('Blokerende kommentar løst') + ' (' + sectionName + ', ' + c.author + '): ' + r.reason,
        { who: 'rådgiver', data: { section: sKey, commentId: c.id, author: c.author, dept: c.dept } });
    }
    emitMemoChanged(sKey);
    return true;
  });
}
function withdrawMemoComment(sKey, c) {
  if (c.author !== MEMO_ME.author) return Promise.resolve(false); // kun forfatteren
  if (_memoCommentsLocked()) return Promise.resolve(false);
  return CW.confirm({
    title: t('Træk kommentaren tilbage?'),
    text: t('Kommentaren bliver stående i sporet som trukket tilbage.'),
    confirmLabel: t('Træk tilbage'),
  }).then(r => {
    if (!r.ok) return false;
    const list = loadComments(sKey).map(x => x.id === c.id
      ? Object.assign({}, x, { withdrawn: { by: MEMO_ME.author, at: new Date().toISOString() } }) : x);
    saveComments(sKey, list);
    emitMemoChanged(sKey);
    return true;
  });
}

function _memoFill(s, o) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m)); }

/* Rådgiveren svarer på en blokerende kommentar og beder om frigivelse. Den
   bliver ved med at blokere, indtil kontrolfunktionen selv frigiver den. */
function requestMemoRelease(sKey, c, sectionName) {
  if (!isBlockingComment(c) || c.author === MEMO_ME.author) return Promise.resolve(false);
  if (_memoCommentsLocked()) return Promise.resolve(false);
  const dept = t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept);
  const o = { who: c.author, dept, section: sectionName };
  return CW.confirm({
    title: _memoFill(t('Bed {who} om frigivelse'), o),
    text: _memoFill(t('{who} ({dept}) har markeret, at indstillingen ikke kan godkendes uden handling. Skriv, hvad der er gjort. Kun {dept} kan frigive kommentaren. Svaret og frigivelsen logges i sagens historik.'), o),
    requireReason: true,
    reasonLabel: _memoFill(t('Dit svar til {who}'), o),
    confirmLabel: t('Send og bed om frigivelse'),
  }).then(r => {
    if (!r.ok) return false;
    const at = new Date().toISOString();
    saveComments(sKey, loadComments(sKey).map(x => x.id === c.id ? Object.assign({}, x, { release: { by: MEMO_ME.author, at, text: r.reason } }) : x));
    if (window.CW) {
      CW.log('comment-release-requested', _memoFill(t('Bad {who} ({dept}) om at frigive en blokerende kommentar i {section}'), o) + ': ' + r.reason,
        { who: 'rådgiver', data: { section: sKey, commentId: c.id, author: c.author, dept: c.dept } });
      CW.toast(_memoFill(t('Sendt til {who}. Kommentaren blokerer, indtil {dept} frigiver den.'), o));
    }
    emitMemoChanged(sKey);
    return true;
  });
}

/* Demo: kontrolfunktionen svarer. Kort ventetid, så svaret ikke kommer
   øjeblikkeligt. Frigivelsen står i kommentaren, i aktivitetsloggen, i Sagens
   historik og i kvitteringen ved indstilling. */
const _memoReleasePending = {};
const MEMO_RELEASE_REASON_SUB = 'Tilbagetrædelseserklæringen er stillet som betingelse B2 før første udbetaling. Det er tilstrækkeligt til indstillingen. Blokeringen er frigivet.';
const MEMO_RELEASE_REASON = 'Svaret er tilstrækkeligt til indstillingen. Blokeringen er frigivet.';
function simulateMemoRelease(sKey, c, sectionName) {
  const key = sKey + ':' + c.id;
  if (_memoReleasePending[key] || !c.release) return;
  if (_memoCommentsLocked()) return;
  _memoReleasePending[key] = true;
  emitMemoChanged(sKey);
  setTimeout(() => {
    delete _memoReleasePending[key];
    const cur = loadComments(sKey).find(x => x.id === c.id);
    if (!cur || commentState(cur) !== 'open') { emitMemoChanged(sKey); return; }
    const at = new Date().toISOString();
    const reason = /tilbagetrædelse|subordination/i.test(cur.text || '') ? MEMO_RELEASE_REASON_SUB : MEMO_RELEASE_REASON;
    saveComments(sKey, loadComments(sKey).map(x => x.id === c.id ? Object.assign({}, x, { resolved: { by: c.author, dept: c.dept, at, reason } }) : x));
    const dept = t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept);
    const o = { who: c.author, dept, section: sectionName };
    if (window.CW) {
      CW.log('comment-resolved', _memoFill(t('{who} ({dept}) har frigivet sin blokerende kommentar i {section}'), o) + ': ' + t(reason),
        { who: 'system', data: { section: sKey, commentId: c.id, author: c.author, dept: c.dept, reason, actor: c.author + ' (' + dept + ')' } });
      // Sagens historik læser caseState().history
      const cs = CW.caseState();
      CW.setCaseState({ history: (cs.history || []).concat([{ at, type: 'comment-resolved', by: c.author + ', ' + dept, reason,
        note: sectionName + ': ' + t(cur.text), section: sKey, commentId: c.id, reply: cur.release ? cur.release.text : '' }]) });
      CW.toast(_memoFill(t('{who} ({dept}) har frigivet kommentaren i {section}.'), o));
    }
    emitMemoChanged(sKey);
    // Fokus til den sammenfoldede linje, hvis fokus ikke er et andet sted
    const a = document.activeElement;
    // (kommentaren foldes først sammen, når memoet har tegnet sig igen)
    if (!a || a === document.body) {
      let tries = 0;
      const focus = () => {
        const el = document.querySelector('[data-cmt="cmt-' + sKey + '-' + c.id + '"] .memo-cmt-sum');
        if (el) el.focus({ preventScroll: true });
        else if (++tries < 20) setTimeout(focus, 60);
      };
      setTimeout(focus, 60);
    }
  }, 1800);
}

function MemoCommentGroup({ section, isActive, composerOpen, onComposerToggle, onChanged, scrollToSection, version, frozen, lockNote }) {
  const sKey = section.k;
  // Låst version: det frosne spor fra indstillingen, ellers det levende
  const thread = () => (frozen ? (frozen[sKey] || []) : loadComments(sKey));
  const [comments, setComments] = React.useState(thread);
  const [text, setText] = React.useState('');

  React.useEffect(() => { setComments(thread()); }, [sKey, composerOpen, version, frozen]);

  function submit() {
    const txt = text.trim();
    if (!txt) return;
    const next = [...loadComments(sKey), { id: Date.now(), dept: MEMO_ME.id, author: MEMO_ME.author, at: new Date().toISOString(), text: txt }];
    saveComments(sKey, next);
    setComments(next);
    setText('');
    onComposerToggle(null);
    if (onChanged) onChanged();
  }

  const secName = section.num + '. ' + t(section.label);
  function after(ok, c) {
    if (!ok) return;
    setComments(loadComments(sKey));
    if (onChanged) onChanged();
    // Fokus på den sammenfoldede linje, så man ikke mister stedet
    CW.focusSoon('[data-cmt="cmt-' + sKey + '-' + c.id + '"] .memo-cmt-sum');
  }

  if (comments.length === 0 && !composerOpen) return null;
  const openN = comments.filter(c => commentState(c) === 'open').length;

  return (
    <div className={'memo-cmt-group' + (isActive ? ' active' : '')}>
      <div className="memo-cmt-group-head">
        <span className="num">{section.num}</span>
        <button type="button" className="ttl" onClick={() => scrollToSection(sKey)} title={t('Spring til afsnit')}
          style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', textAlign: 'left' }}>{t(section.label)}</button>
        {comments.length > openN && <span style={{ fontWeight: 400, color: 'var(--c-text-3)', whiteSpace: 'nowrap' }}>{openN} {memoOpenWord(openN)}</span>}
        {!composerOpen && !lockNote && (
          <button type="button" className="memo-cmt-add" onClick={() => onComposerToggle(sKey)} aria-label={t('Tilføj kommentar til') + ' ' + secName}>{t('+ Tilføj')}</button>
        )}
      </div>

      {comments.map(c => (
        <MemoComment key={c.id} c={c} section={section} lockNote={lockNote}
          onResolve={(x) => resolveMemoComment(sKey, x, secName).then(ok => after(ok, x))}
          onRequest={(x) => requestMemoRelease(sKey, x, secName).then(ok => {
            if (!ok) return;
            setComments(loadComments(sKey));
            if (onChanged) onChanged();
            CW.focusSoon('[data-cmt="cmt-' + sKey + '-' + x.id + '"] .memo-cmt-actions button');
          })}
          onSimulate={(x) => simulateMemoRelease(sKey, x, secName)}
          onWithdraw={(x) => withdrawMemoComment(sKey, x).then(ok => after(ok, x))}/>
      ))}

      {composerOpen && (
        <div className="memo-cmt-form">
          <label className="memo-cmt-as" htmlFor={'cmt-new-' + sKey}>{t('Du skriver som')} <b style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{MEMO_ME.author} · {t(MEMO_ME.label)}</b></label>
          <textarea
            id={'cmt-new-' + sKey}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('Skriv en kommentar til kollegaer fra andre afdelinger…')}
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
            >{t('Annullér')}</button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!text.trim()}
              onClick={submit}
            >{t('Send')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MemoCommentsRail (right column, scroll-synced like Google Docs) ────── */

/* Når ingen kommenteret sektion er i syne, står der ellers "6 på tværs af
   memoet" over et tomt felt. Så vises i stedet alle kommentarer samlet pr.
   afsnit, og et klik springer til afsnittet. */
function MemoCommentsOverview({ sections, counts, scrollToSection, frozen }) {
  const groups = sections.filter(s => (counts.all[s.k] || 0) > 0);
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '10px 12px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 8, lineHeight: 1.5 }}>
        {t('Ingen kommenterede afsnit i syne.')}
      </div>
      {groups.map(s => (
        <div key={s.k} style={{ marginBottom: 10 }}>
          <button type="button" onClick={() => scrollToSection(s.k)}
            style={{ display: 'flex', alignItems: 'baseline', gap: 6, width: '100%', padding: '4px 0', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--c-text-2)' }}>
            <span style={{ color: 'var(--c-text-3)', fontWeight: 400 }}>{s.num}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{t(s.label)}</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--c-text-3)', whiteSpace: 'nowrap' }}>{counts.open[s.k] || 0} {memoOpenWord(counts.open[s.k] || 0)}{counts.all[s.k] > (counts.open[s.k] || 0) ? ' · ' + (counts.all[s.k] - (counts.open[s.k] || 0)) + ' ' + t('løst') : ''}</span>
          </button>
          {/* Kun de blokerende vises i oversigten. Resten står ud for afsnittet,
              så oversigten ikke får sin egen rullebjælke. */}
          {(frozen ? (frozen[s.k] || []) : loadComments(s.k)).filter(c => isBlockingComment(c) && commentState(c) === 'open').map(c => {
            const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
            const st = commentState(c);
            const blocking = isBlockingComment(c) && st === 'open';
            return (
              <button key={c.id} type="button" onClick={() => scrollToSection(s.k)} className={'memo-cmt' + (st !== 'open' ? ' ' + st : '') + (blocking ? ' blocking' : '')}
                style={{ width: '100%', marginTop: 5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <span className="memo-cmt-body">
                  <span className="memo-cmt-meta"><b>{c.author}</b><span className="memo-cmt-dept">· {t(d.label)}</span>
                    {blocking && <span className="memo-cmt-flag">{t('Blokerer indstilling')}</span>}</span>
                  {st === 'open'
                    ? <span className="memo-cmt-text" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t(c.text)}</span>
                    : <span className="memo-cmt-time">{(st === 'resolved' ? t('Løst af') + ' ' + c.resolved.by : t('Trukket tilbage af') + ' ' + c.withdrawn.by)}</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MemoCommentsRail({ sections, positions, viewportRef, height, activeKey, composerForKey, onComposerToggle, onChanged, scrollToSection, counts, version, frozen, lockNote }) {
  const RAIL_VIEWPORT_H = height || 600;
  // Tåler at tællerne eller placeringerne ikke er klar endnu
  counts = counts || memoCommentCounts();
  positions = positions || {};
  sections = sections || MEMO_SECTIONS;
  const totalCount = counts.allTotal;
  // Er nogen kommenteret sektion (eller en åben kommentarboks) inden for skinnen?
  // En tråd står ud for sit afsnit. Er afsnittets top rullet op over skinnen,
  // bliver tråden stående øverst, så længe afsnittet er i syne.
  const placeOf = (k) => {
    const p = positions[k];
    if (!p) return null;
    let top = p.t;
    if (top < 0 && p.b > 60) top = Math.min(0, p.b - 180);
    return top;
  };
  const anyVisible = sections.some(s => {
    const top = placeOf(s.k);
    if (top == null) return false;
    if (!(counts.all[s.k] > 0) && composerForKey !== s.k) return false;
    return top >= -180 && top <= RAIL_VIEWPORT_H - 40;
  });
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Fanen over skinnen hedder allerede Kommentarer. Her står kun tallene. */}
      <div className="memo-rail-meta" style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-line-2)', fontSize: 12, color: 'var(--c-text-3)' }}>
        {counts.openTotal} {memoOpenWord(counts.openTotal)}
        {counts.resolvedTotal > 0 && <> · {counts.resolvedTotal} {t('løst')}</>}
        {counts.blocking > 0 && <> · {counts.blocking} {t('blokerer')}</>}
      </div>
      <div ref={viewportRef} style={{ position: 'relative', height: RAIL_VIEWPORT_H, overflow: 'hidden' }}>
        {totalCount > 0 && !anyVisible && composerForKey == null && (
          <MemoCommentsOverview sections={sections} counts={counts} scrollToSection={scrollToSection} frozen={frozen}/>
        )}
        {(anyVisible || composerForKey != null) && sections.map(s => {
          const top = placeOf(s.k);
          if (top == null) return null;
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
                version={version}
                isActive={activeKey === s.k}
                composerOpen={composerForKey === s.k}
                onComposerToggle={onComposerToggle}
                onChanged={onChanged}
                scrollToSection={scrollToSection}
                frozen={frozen}
                lockNote={lockNote}
              />
            </div>
          );
        })}
        {totalCount === 0 && composerForKey == null && (
          <div style={{ padding: '24px 14px', fontSize: 12, color: 'var(--c-text-3)', textAlign: 'center', lineHeight: 1.6 }}>
            {t('Ingen kommentarer endnu. Hold markøren over et afsnit, og klik på')} <span style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--c-line-strong)', color: 'var(--c-text-2)', fontSize: 11, verticalAlign: 'middle' }}>+</span> {t('for at starte en tråd.')}
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
  try { return JSON.parse(localStorage.getItem(SNAP_KEY + sKey + LANG_SUFFIX) || '[]'); } catch (e) { return []; }
}

function saveSnaps(sKey, list) {
  try { localStorage.setItem(SNAP_KEY + sKey + LANG_SUFFIX, JSON.stringify(list.slice(-MAX_SNAPS))); } catch (e) {}
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
  return t({
    write: 'skrev afsnittet forfra',
    rewrite: 'omskrev afsnittet',
    selection: 'omskrev en markering',
    chat: 'indsatte tekst fra chatten',
    reset: 'nulstillede til skabelonen',
    review: 'markerede afsnittet som gennemgået',
    table: 'ændrede tabellen',
  }[action] || 'ændrede afsnittet');
}

/* ── MemoSection ──────────────────────────────────────────────────────────── */
function MemoSection({ id, sKey, num, title, st, readOnly, lockedHtml, onFocusSection, resetTrigger, onAddComment, commentCount, registerApi, aiOpen, onToggleAi, aiSelection, onCloseAi, onConnectAi, onReviewedNext, docLang, onUnreviewed, isActive }) {
  const storageKey = memoKey(sKey);
  // Skabelonens tekst bærer sit eget ophavsmærke, se stampSeed
  const defaultHtml = stampSeed(SEC[sKey] || '');
  const ref = React.useRef(null);
  const [modified, setModified] = React.useState(() => localStorage.getItem(storageKey) !== null);

  // Initialize innerHTML once on mount. Er sagen indstillet, vises den frosne
  // version fra indstillingen, ikke det der måtte ligge i kladden.
  React.useEffect(() => {
    if (!ref.current) return;
    if (lockedHtml != null) { ref.current.innerHTML = lockedHtml; decorateCites(ref.current); return; }
    const saved = localStorage.getItem(storageKey);
    ref.current.innerHTML = saved !== null ? saved : defaultHtml;
    decorateCites(ref.current);
  }, []);

  const persist = React.useCallback(() => {
    if (!ref.current) return;
    localStorage.setItem(storageKey, ref.current.innerHTML);
    setModified(true);
    emitMemoChanged(sKey);
  }, [storageKey]);

  /* Gør afsnittet styrbart udefra: AI-assistenten, chatten og
     "Generér memo" skriver alle igennem det her lille API. */
  React.useEffect(() => {
    if (!registerApi) return;
    // Gem altid det der stod før, så ændringen kan rulles tilbage. Det der
    // skrives her er maskintekst, så en tidligere gennemgang gælder ikke længere.
    const snap = (action) => { if (ref.current) pushSnap(sKey, ref.current.innerHTML, action); saveReview(sKey, null); };
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
        if (last.action === 'review') saveReview(sKey, null);
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
    // Tilbage til skabelonens udkast: gennemgangen gælder ikke længere
    saveReview(sKey, null);
    try { localStorage.removeItem(memoTouchedKey(sKey)); } catch (e) {}
    if (ref.current) ref.current.innerHTML = defaultHtml;
    setModified(false);
    emitMemoChanged(sKey);
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
    // Fortrydes en gennemgang, er afsnittet heller ikke gennemgået længere
    if (last.action === 'review') saveReview(sKey, null);
    setModified(true);
    emitMemoChanged(sKey);
  }

  /* Rådgiveren står inde for afsnittet. Udkast-mærkerne fjernes, men ophavet
     (data-ai) bliver, så man stadig kan se hvad maskinen skrev. Gemmer navn
     og tidspunkt. Kan fortrydes med Fortryd, som ethvert andet trin. */
  function markReviewed() {
    if (!ref.current) return false;
    // Dobbeltklik, eller et klik på en knap, der ikke er tegnet om endnu: er
    // afsnittet allerede gennemgået (status læses frisk), sker der ingenting.
    // Ellers kom der et ekstra fortryd-trin, og et klik kunne gå tabt.
    if (memoSectionStatus(sKey).reviewed) return false;
    pushSnap(sKey, ref.current.innerHTML, 'review');
    ref.current.querySelectorAll('.tpl-draft-label').forEach(lbl => lbl.remove());
    ref.current.querySelectorAll('.tpl-draft').forEach(d => d.classList.remove('tpl-draft'));
    // Teksten gemmes først: gennemgangen får et fingeraftryk af det gemte
    persist();
    saveReview(sKey, { by: MEMO_REVIEWER, at: new Date().toISOString() });
    return true;
  }

  /* Fortryd gennemgangen fra linjen "Gennemgået af …". Var gennemgangen det
     seneste trin, rulles teksten tilbage med udkastmærkerne. Ellers (fx en
     gennemgang fra før fortryd-trinene) fjernes kun gennemgangen. */
  function undoReview() {
    const last = loadSnaps(sKey).slice(-1)[0];
    if (last && last.action === 'review') undoAi();
    else { saveReview(sKey, null); emitMemoChanged(sKey); }
    onUnreviewed && onUnreviewed(sKey);
  }

  /* Et klik (eller en pil) ind i en pladsholder som "[dato]" markerer hele
     pladsholderen, så det, man skriver, erstatter den i stedet for at havne
     inde i klammerne. Har brugeren selv markeret noget, røres det ikke. */
  const selectBlank = (target) => {
    if (readOnly || !ref.current || !target || !target.closest) return;
    const bl = target.closest('.tpl-blank');
    if (!bl || !ref.current.contains(bl)) return;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return;
    const r = document.createRange();
    r.selectNodeContents(bl);
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const handleInput = () => {
    if (!ref.current) return;
    /* Rådgiveren retter i en blok skrevet af AI'en eller skabelonen. Ophavet
       BEVARES, men skifter til "rettet". Sporet må ikke forsvinde, for så kan
       ingen bagefter se hvad maskinen skrev. Udkast-mærket bliver også stående:
       at rette et ord er ikke det samme som at stå inde for hele afsnittet.
       Det fjernes først med "Markér som gennemgået". */
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.anchorNode) {
        let el = sel.anchorNode;
        if (el.nodeType === 3) el = el.parentElement;
        const block = el && el.closest ? el.closest('[data-ai]') : null;
        const o = block ? block.getAttribute('data-ai') : null;
        if (o === 'ai' || o === 'chat' || o === 'seed') block.setAttribute('data-ai', 'edited');
      }
    } catch (e) { /* selection may be unavailable; ignore */ }

    // Der er skrevet i en pladsholder: den er ikke tom længere og mister sin stil
    try {
      const sel = window.getSelection();
      let n = sel && sel.anchorNode;
      if (n && n.nodeType === 3) n = n.parentElement;
      const bl = n && n.closest ? n.closest('.tpl-blank') : null;
      if (bl && ref.current.contains(bl)) {
        bl.classList.remove('tpl-blank');
        if (!bl.className) bl.removeAttribute('class');
      }
    } catch (e) {}

    localStorage.setItem(storageKey, ref.current.innerHTML);
    markTouched(sKey);
    setModified(true);
    emitMemoChanged(sKey);
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
    // I en tabel flytter Tab mellem celler. Uden for tabeller fanges Tab ikke,
    // så fokus kan forlade editoren som alle andre steder. Før blev Tab brugt
    // til indrykning, og man kunne ikke komme ud med tastaturet.
    const cell = cellAtSelection(ref.current);
    if (!cell) return;
    const next = siblingCell(cell, e.shiftKey ? -1 : 1);
    // Fra første eller sidste celle går Tab videre ud af tabellen, ellers
    // bliver tabellen selv en fælde. Nye rækker tilføjes med "Række under".
    if (!next) return;
    e.preventDefault();
    focusCell(next);
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
    markTouched(sKey);
    persist();
    if (target) focusCell(target);
    setTimeout(syncTableCell, 0);
  }

  const isPlaceholder = false;
  const secName = num + '. ' + t(title);

  /* Skabelonens vejledning (M12): foldet, når afsnittet har tekst. Antallet
     tælles i afsnittets egen tekst, efter hver ændring. */
  const [showGuide, setShowGuide] = React.useState(false);
  const [guideCount, setGuideCount] = React.useState(0);
  React.useEffect(() => {
    if (ref.current) setGuideCount(ref.current.querySelectorAll('.tpl-hints, .tpl-hint, .tpl-note, .tpl-guide').length);
  }, [st]);
  const guideFolded = !!(st && st.hasContent) && guideCount > 0 && !showGuide;
  // Et dybdelink til et felt i vejledningen folder den ud
  React.useEffect(() => {
    const on = (e) => { if (e.detail && e.detail.sKey === sKey) setShowGuide(true); };
    window.addEventListener('memo-show-guide', on);
    return () => window.removeEventListener('memo-show-guide', on);
  }, [sKey]);

  return (
    <div id={id} className={'memo-sec' + (isActive ? ' active' : '') + (guideFolded ? ' guide-folded' : '')} data-reviewed={st && st.reviewed ? '1' : undefined} style={{ marginBottom: 34, scrollMarginTop: 64 /* under den faste værktøjslinje */ }}>
      {/* Indstillet: ingen nye kommentarer i den låste version */}
      {!readOnly && <button
        type="button"
        className="memo-sec-add"
        title={t('Tilføj kommentar til dette afsnit')}
        aria-label={t('Tilføj kommentar til') + ' ' + secName}
        onClick={(e) => { e.stopPropagation(); onAddComment && onAddComment(sKey); }}
      >+</button>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--c-text-3)', width: 20, flexShrink: 0 }}>{num}</span>
        <h2 id={id + '-h'} tabIndex={-1} style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', flex: 1, minWidth: 160, outline: 'none' }}>{docLang ? _memoTL(docLang, title) : t(title)}</h2>
        {!readOnly && (
          <button
            type="button"
            className={'memo-sec-ai' + (aiOpen ? ' on' : '')}
            title={t('Lad AI skrive eller omskrive dette afsnit')}
            aria-label={t('Skriv med AI') + ': ' + secName}
            aria-expanded={!!aiOpen}
            onClick={() => onToggleAi && onToggleAi(sKey)}
          >{t('Skriv med AI')}</button>
        )}
        {st && st.hasContent && guideCount > 0 && (
          <button type="button" className="btn-ghost-sm memo-guide-btn" aria-pressed={showGuide}
            onClick={() => setShowGuide(v => !v)}
            title={showGuide ? t('Skjul skabelonens vejledning') : t('Vis skabelonens vejledning')}
            style={{ height: 22, fontSize: 12, color: 'var(--c-text-3)', background: showGuide ? 'var(--c-surface-2)' : undefined }}>
            {t('Vejledning')} ({guideCount})
          </button>
        )}
        {/* Er gennemgangen det seneste trin, står fortryd ved "Gennemgået af" nederst */}
        {snaps > 0 && !readOnly && !(st && st.reviewed && (loadSnaps(sKey).slice(-1)[0] || {}).action === 'review') && (
          <button
            type="button"
            onClick={undoAi}
            title={t('Fortryd') + ': ' + snapLabel((loadSnaps(sKey).slice(-1)[0] || {}).action) + '. ' + snaps + ' ' + t('trin gemt.')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 22, padding: '0 8px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--c-line)', background: '#fff',
              color: 'var(--c-text-2)', fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
            }}
          >
            <I.Undo size={11}/> {t('Fortryd')}
          </button>
        )}
        {commentCount > 0 && (
          <span style={{ fontSize: 12, color: 'var(--c-text-3)', whiteSpace: 'nowrap' }}>
            {commentCount} {commentCount === 1 ? t('kommentar') : t('kommentarer')}
          </span>
        )}
      </div>

      {/* AI-panelet åbner lige under overskriften. Før åbnede det nederst i
          afsnittet, i Risikovurdering 1.000 pixel længere nede, så det lignede
          at der ikke skete noget. */}
      {aiOpen && !readOnly && window.MemoAI && (
        <window.MemoAI.AiSectionAssistant
          sKey={sKey}
          num={num}
          title={title}
          selection={aiSelection}
          onConnect={onConnectAi}
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
            // Ny maskintekst: afsnittet er ikke gennemgået længere
            saveReview(sKey, null);
            persist();
            return true;
          }}
          onAppend={(html) => {
            if (!ref.current) return true;
            pushSnap(sKey, ref.current.innerHTML, 'chat');
            ref.current.insertAdjacentHTML('beforeend', html);
            saveReview(sKey, null);
            persist();
            return true;
          }}
          onClose={() => onCloseAi && onCloseAi()}
        />
      )}

      <div
        ref={ref}
        className="memo-body"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-readonly={readOnly ? 'true' : undefined}
        aria-label={secName}
        data-placeholder={isPlaceholder ? t('Skrives af rådgiveren…') : undefined}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onMouseUp={(e) => { selectBlank(e.target); _memoLastEditable = ref.current; _memoSaveSelection(); syncTableCell(); }}
        onKeyUp={(e) => {
          // Markøren flyttes ind i en pladsholder med piltasterne: hele pladsholderen markeres
          if (/^Arrow/.test(e.key) && !e.shiftKey) { const s = window.getSelection(); const n = s && s.anchorNode; selectBlank(n && (n.nodeType === 3 ? n.parentElement : n)); }
          _memoLastEditable = ref.current; _memoSaveSelection(); syncTableCell();
        }}
        onFocus={() => { _memoLastEditable = ref.current; if (!readOnly) onFocusSection(sKey, modified); }}
        onBlur={() => { setTimeout(syncTableCell, 150); onFocusSection(null, false); }}
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
          <span className="memo-tbl-lbl">{t('Tabel')}</span>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertRow, 'above')} title={t('Indsæt række over')}>{t('Række over')}</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertRow, 'below')} title={t('Indsæt række under')}>{t('Række under')}</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableDeleteRow)} title={t('Slet den række markøren står i')}>{t('Slet række')}</button>
          <span className="memo-tbl-sep"/>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertCol, 'left')} title={t('Indsæt kolonne til venstre')}>{t('Kolonne venstre')}</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableInsertCol, 'right')} title={t('Indsæt kolonne til højre')}>{t('Kolonne højre')}</button>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => tableOp(tableDeleteCol)} title={t('Slet den kolonne markøren står i')}>{t('Slet kolonne')}</button>
          <span className="memo-tbl-hint">{t('Tab skifter celle')}</span>
        </div>
      )}

      {/* Gennemgang: rådgiveren står aktivt inde for afsnittet. En stille række:
          status i gråt og én ghost-knap, der markerer og går videre til det
          næste udkast. Forklaringen står én gang i memoets top. */}
      {st && st.unreviewed && (
        <div className="memo-review todo">
          {st.stale ? (
            <span className="rv-text" title={t('Gennemgået af') + ' ' + st.stale.by + ', ' + (window.CW ? CW.fmtWhen(st.stale.at) : st.stale.at) + '. ' + t('Teksten er ændret siden, så gennemgangen gælder ikke længere.')}>
              <b>{t('Ændret efter gennemgang, gennemgå igen.')}</b>
            </span>
          ) : (
            <span className="rv-text">{t('Ikke gennemgået')}</span>
          )}
          {!readOnly && (
            <button type="button" className="btn btn-sm rv-go"
              onClick={() => { if (markReviewed()) onReviewedNext && onReviewedNext(sKey); }}
              title={t('Markér som gennemgået og gå til næste')}
              aria-label={t('Markér som gennemgået') + ': ' + secName}>
              {t('Markér som gennemgået')}
            </button>
          )}
        </div>
      )}
      {st && st.reviewed && (
        <div className="memo-review done" id={id + '-reviewed'} tabIndex={-1}>
          <span className="rv-text" title={window.CW ? CW.fmtWhen(st.reviewed.at) : st.reviewed.at}>
            <span aria-hidden="true">✓ </span>{t('Gennemgået af')} {st.reviewed.by}, {_memoFmtDay(st.reviewed.at)}
            {st.blanks ? ' · ' + st.blanks + ' ' + (st.blanks === 1 ? t('felt mangler') : t('felter mangler')) : ''}
          </span>
          {!readOnly && (
            <button type="button" className="btn-ghost-sm rv-undo" onClick={undoReview}
              aria-label={t('Fortryd gennemgang') + ': ' + secName}>
              {t('Fortryd')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Klargøring til eksport ──────────────────────────────────────────────────
   Det eksporterede dokument er det eneste af værktøjet nogen uden for huset
   ser. Skabelonens vejledningstekst, gule Udkast-mærker og interne noter må
   ikke følge med ud til kreditkomitéen.
   ──────────────────────────────────────────────────────────────────────────── */

function prepareForExport(html, lang) {
  const t = (s) => (lang ? _memoTL(lang, s) : window.t(s));
  const d = document.createElement('div');
  d.innerHTML = html || '';

  // Vejledning og noter til den der skriver. Hører ikke hjemme i det færdige dokument.
  d.querySelectorAll('.tpl-hints, .tpl-hint, .tpl-guide, .tpl-note').forEach(el => el.remove());

  // Ophavsmærkerne er internt arbejdsmateriale. Om et afsnit er gennemgået,
  // skrives i stedet ud ved afsnittet (se exportMemoToWord).
  d.querySelectorAll('[data-ai]').forEach(el => {
    el.removeAttribute('data-ai');
    el.removeAttribute('data-ai-at');
    el.removeAttribute('data-ai-label');
  });

  // Det lille "Udkast"-mærke ryger, men blokken beholder en streg i margenen,
  // så komitéen kan se præcis hvilken tekst der ikke er gennemgået.
  d.querySelectorAll('.tpl-draft-label').forEach(el => el.remove());
  d.querySelectorAll('.tpl-draft').forEach(el => { el.classList.remove('tpl-draft'); el.classList.add('draft-block'); });

  // Uudfyldte felter skal være synlige for læseren, ikke camoufleret som tekst.
  d.querySelectorAll('.tpl-blank').forEach(el => {
    const txt = (el.textContent || '').trim().replace(/^\[|\]$/g, '');
    const mark = document.createElement('span');
    mark.className = 'blank';
    mark.textContent = '[' + t('ikke udfyldt') + ': ' + txt + ']';
    el.replaceWith(mark);
  });

  // Kildehenvisningerne beholder deres tekst, men bliver til en fodnotelignende
  // reference så læseren kan se hvor tallet kommer fra i et Word-dokument.
  // Bilagslisten i Word nævner alle sagens dokumenter, også de nye
  memoAppendixAdd(d);

  // Et tal, kildeviseren ikke kan finde eller finder modsagt, får en advarsel
  const unconfirmed = new Set([...d.querySelectorAll('.memo-cite')].filter(el => {
    const st = memoCiteCheckState(el);
    return st === 'missing' || st === 'contra';
  }));
  d.querySelectorAll('.memo-cite').forEach(el => {
    const doc = el.getAttribute('data-doc');
    const page = el.getAttribute('data-page');
    if (doc) {
      const ref = document.createElement('span');
      ref.className = 'cite-ref';
      ref.textContent = ' [' + doc + (page ? ', ' + memoRefLabel(page, lang) : '') + ']';
      el.after(ref);
      if (unconfirmed.has(el)) {
        const warn = document.createElement('span');
        warn.className = 'blank';
        warn.textContent = ' [' + t('ikke bekræftet i kilden') + ']';
        ref.after(warn);
      }
    }
    el.replaceWith(...el.childNodes);
  });

  return d.innerHTML;
}

/** Tæller hvad der mangler, så man advares før man sender. Samme status som
    sektionsoversigten, så dialogen ikke kan sige noget andet end skærmen. */
/* Tæller som klarhedstjekket: komitéens felter (afsnit 11) er ikke mangler,
   og i en indstillet version er de øvrige tomme felter begrundet. */
function exportReadiness(sections) {
  const empty = [], drafts = [];
  const locked = memoLocked();
  let caseData = 0, template = 0, committee = 0, reviewed = 0;
  const blankSecs = {};
  sections.forEach(s => {
    const html = locked && locked.sections && locked.sections[s.k] != null ? locked.sections[s.k] : null;
    const st = memoSectionStatus(s.k, html, memoLockedReview(locked, s.k));
    const name = s.num + '. ' + t(s.label);
    if (st.state === 'empty') empty.push(name);
    if (st.unreviewed) drafts.push(name);
    if (st.reviewed) reviewed++;
    memoBlankFields(s.k, html).forEach(f => {
      if (f.group === 'committee') { committee++; return; }
      if (f.group === 'auto') return;
      if (f.group === 'template') template++; else caseData++;
      blankSecs[s.k] = true;
    });
  });
  return { blanks: caseData + template, caseData, template, committee, blankSecs: Object.keys(blankSecs).length,
    reviewed, total: sections.length, empty, drafts, locked };
}
/* Samme statuslinje i eksportdialogen og i Word-filen. tt: sprogfunktion. */
function memoExportStatusLine(r, tt) {
  tt = tt || t;
  return _memoFill(tt('{a} af {n} afsnit gennemgået'), { a: r.reviewed, n: r.total })
    + (r.blankSecs ? ', ' + _memoFill(r.locked ? tt('{n} med begrundede tomme felter') : tt('{n} med tomme felter'), { n: r.blankSecs }) : '') + '.'
    + (r.committee ? ' ' + tt('Felterne i afsnit 11 udfyldes af kreditkomitéen.') : '')
    + (r.drafts.length ? ' ' + r.drafts.length + ' ' + tt('afsnit er udkast, der ikke er gennemgået af rådgiver, og er markeret nedenfor.') : '');
}

/* Eksportdialogens linje for et udkast: "Mærket Udkast: 14 afsnit er ikke
   gennemgået, og 18 felter er tomme. De tomme felter er markeret i filen."
   Felterne tælles som i klarhedstjekket (uden komitéens felter i afsnit 11). */
function memoExportDraftLine(r) {
  const parts = [];
  if (r.drafts.length) parts.push(_memoFill(t('{n} afsnit er ikke gennemgået'), { n: r.drafts.length }));
  if (r.empty.length) parts.push(_memoFill(t('{n} afsnit er ikke skrevet'), { n: r.empty.length }));
  if (r.blanks) parts.push(_memoFill(r.blanks === 1 ? t('{n} felt er tomt') : t('{n} felter er tomme'), { n: r.blanks }));
  if (!parts.length) return t('Mærket Udkast, fordi memoet ikke er indstillet.');
  const list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ', ' + t('og') + ' ' + parts[parts.length - 1];
  return t('Mærket Udkast') + ': ' + list + '.' + (r.blanks ? ' ' + t('De tomme felter er markeret i filen.') : '');
}

/* Vises før eksport. Man skal vide hvad man sender, ikke opdage det bagefter. */
function ExportDialog({ sections, onClose }) {
  const [withComments, setWithComments] = React.useState(false);
  const ready = React.useMemo(() => exportReadiness(sections), [sections]);
  const commentCount = React.useMemo(
    () => sections.reduce((n, s) => n + loadComments(s.k).length, 0), [sections]);
  const boxRef = React.useRef(null);
  CW.useDialog(boxRef, true, onClose);

  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', zIndex: 9500, display: 'grid', placeItems: 'center', padding: 24 }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('Eksportér til Word')}
        onMouseDown={e => e.stopPropagation()}
        style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
      >
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Eksportér til Word')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.55 }}>
            {t('Filen indeholder det samme som skærmen. Skabelonens vejledningstekst fjernes, og kildehenvisninger skrives ud som dokumentnavn og side, så modtageren kan slå efter.')}
          </div>
          {/* Én grå linje om, hvad filen er. En eksport af et udkast er en
              oplysning, ikke en fejl. Filen selv stemples som før. */}
          <div className="memo-export-state" style={{ fontSize: 12.5, marginTop: 8, color: 'var(--c-text-2)', lineHeight: 1.55 }}>
            {ready.locked
              ? _memoFill(t('Indstillet version {v}, låst'), { v: ready.locked.version }) + '. ' + memoExportStatusLine(ready)
              : memoExportDraftLine(ready)}
          </div>
        </div>

        <div style={{ padding: '16px 24px 4px' }}>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
            <input type="checkbox" checked={withComments} onChange={e => setWithComments(e.target.checked)} style={{ marginTop: 2 }}/>
            <span>
              <span style={{ fontSize: 13, color: 'var(--c-ink)' }}>{t('Tag de interne kommentarer med')}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.5 }}>
                {commentCount} {commentCount === 1 ? t('kommentar') : t('kommentarer')} {t('fra Kredit, Compliance, Erhverv og Risiko. Skal normalt blive i huset.')}
              </span>
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 24px 20px' }}>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm" onClick={onClose}>{t('Annullér')}</button>
          <button className="btn btn-sm btn-primary" onClick={() => { exportMemoToWord(sections, { comments: withComments }); onClose(); }}>
            {t('Hent filen')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Word export ─────────────────────────────────────────────────────────── */
function exportMemoToWord(sections, opts) {
  opts = opts || {};
  // En indstillet version eksporteres på det sprog, den blev indstillet på,
  // så dokumentet ikke blander etiketter og tekst fra to sprog
  const lockedDoc = memoLocked();
  const uiLang = MEMO_EN ? 'en' : 'da';
  const docLang = lockedDoc && lockedDoc.sections && lockedDoc.lang ? lockedDoc.lang : uiLang;
  const t = (s) => _memoTL(docLang, s);
  const fmtWhen = (iso) => (docLang === uiLang ? CW.fmtWhen(iso) : _memoFmtLang(iso, docLang, true));
  const fmtDay = (iso) => (docLang === uiLang ? _memoFmtDay(iso) : _memoFmtLang(iso, docLang));
  const esc = (s) => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts = [];
  parts.push(`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`);
  const CO = (window.DATA && DATA.COMPANY) || {};
  const coName = CO.name || 'Nordhavn Composite A/S';
  parts.push(`<head><meta charset="utf-8"><title>${esc(t('Kreditindstilling'))} - ${esc(coName)}</title>`);
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
    .draft-flag { color: #1d4ed8; background: #eef3ff; border-left: 3pt solid #1d4ed8; padding: 3pt 8pt; font-size: 9.5pt; font-weight: 600; }
    .draft-block { border-left: 2pt solid #9db4f0; padding-left: 8pt; margin: 4pt 0; }
    .reviewed { color: #107a4a; font-size: 9pt; }
    .status { background: #f5f5f5; padding: 6pt 10pt; font-size: 10pt; }
    .stamp { font-size: 9.5pt; font-weight: 600; padding: 4pt 8pt; margin: 0 0 10pt; }
    .stamp.draft { color: #92400e; background: #fff8e6; border-left: 3pt solid #d97706; }
    .stamp.locked { color: #107a4a; background: #eefaf3; border-left: 3pt solid #107a4a; }
    table.facts td { border: 0.5pt solid #bbb; padding: 4pt 6pt; font-size: 10pt; }
  </style></head><body>`);
  // Stempel: hvilken version er det, og står nogen inde for den? Et udkast og
  // den indstillede version må ikke kunne forveksles, når filen sendes videre.
  const locked = memoLocked();
  const lockedSecs = locked && locked.sections ? locked.sections : null;
  // Forsiden fra indstillingen, ellers den levende (uden "Udkast:", når sagen er indstillet)
  const front = locked && locked.front ? locked.front : null;
  const stamp = locked
    ? t('Indstillet version') + ' ' + locked.version + ', ' + fmtDay(locked.at) + '. ' + t('Låst: svarer til det, kreditkomitéen har fået.') + (locked.past ? ' ' + t('Tidligere version, ikke den gældende.') : '')
    : t('Udkast') + ', ' + t('ikke indstillet') + '. ' + t('Kan ændre sig før indstilling.');
  parts.push(`<p class="stamp ${locked ? 'locked' : 'draft'}">${esc(stamp)} ${esc(t('Eksporteret'))} ${esc(fmtWhen(new Date().toISOString()))}.</p>`);
  parts.push(`<h1>${esc(t('Kreditindstilling'))} · ${esc(coName)}</h1>`);
  parts.push(`<p class="meta"><strong>${esc(t('Indstilling af'))} ${esc(t('nyt engagement'))} ${esc(t('til'))} ${esc(t('Kreditkomité'))}</strong><br/>${esc(t('Kreditrisiko:'))} ${esc(front ? front.risk : memoRisk())} · ${esc(t('Kundetype:'))} ${esc(t('Erhverv, SMV'))}</p>`);
  parts.push(`<table style="width:100%; font-size:10pt; margin: 8pt 0 14pt;">`);
  parts.push(`<tr><td><strong>${esc(t('Dato:'))}</strong> ${esc(memoDate(locked, docLang))}</td><td><strong>CVR:</strong> ${esc(CO.cvr || '')}</td></tr>`);
  parts.push(`<tr><td><strong>${esc(t('Status:'))}</strong> ${esc(locked ? t('Indstillet version') + ' ' + locked.version : t('Udkast'))}</td><td></td></tr>`);
  parts.push(`<tr><td><strong>${esc(t('Branche:'))}</strong> ${esc(t('Vindmøllekomponenter / komposit'))}</td><td><strong>${esc(t('Sagsnr.:'))}</strong> ${esc(CO.caseNr || '')}</td></tr>`);
  parts.push(`<tr><td><strong>${esc(t('Primær kundeansvarlig:'))}</strong> ${esc(t('Mette Larsen, Kredit'))}</td><td><strong>${esc(t('Sekundær:'))}</strong> ${esc(t('Sofie Andersen, Erhverv'))}</td></tr>`);
  parts.push(`</table>`);
  parts.push(`<p class="meta">${esc(t('Dispensation fra acceptkriterie'))}: ${esc(t('Ingen'))} · ${esc(t('Eksporteret'))} ${esc(fmtDay(new Date().toISOString()))}</p>`);
  parts.push(memoFactsHtml(esc, front ? front.facts : memoFacts({ final: !!locked }), docLang));

  // Filen skal svare til skærmen. Før blev hvert afsnit rådgiveren ikke selv
  // havde tastet i, eksporteret som "[afsnittet er ikke skrevet]", mens
  // skærmen viste tekst. Nu eksporteres det der vises, og udkast der ikke er
  // gennemgået, markeres ved afsnittet, så komitéen ved hvad nogen står inde for.
  // Er sagen indstillet, er det den frosne version, der eksporteres.
  const htmlOf = (k) => (lockedSecs && lockedSecs[k] != null ? lockedSecs[k] : sectionHtml(k));
  const status = sections.map(s => memoSectionStatus(s.k, lockedSecs ? htmlOf(s.k) : null, memoLockedReview(locked, s.k)));
  // Samme tal som skærmen og eksportdialogen: gennemgåede afsnit. Komitéens
  // felter i afsnit 11 tælles ikke som tomme felter, rådgiveren skal begrunde.
  const statusLine = memoExportStatusLine(exportReadiness(sections), t);
  parts.push(`<p class="status">${esc(locked ? t('Status ved indstilling:') : t('Status ved eksport:'))} ${esc(statusLine)}</p>`);
  // Den indstillede version får kvitteringen med: note, begrundelser, frigivne
  // blokeringer, sprunget kundeinput og åbne kommentarer, som ved indstillingen
  if (locked && lockedSecs) parts.push(memoReceiptHtml(locked, esc, t, fmtWhen));

  sections.forEach((s, i) => {
    const st = status[i];
    const heading = /^B\d/.test(s.num) ? esc(t(s.label)) : `${esc(s.num)}) ${esc(t(s.label))}`;
    parts.push(`<h2>${heading}</h2>`);
    if (st.state === 'empty') {
      parts.push(`<p class="blank">[${esc(t('afsnittet er ikke skrevet'))}]</p>`);
    } else {
      if (st.stale) parts.push(`<p class="draft-flag">[${esc(t('Ændret efter gennemgang, ikke gennemgået igen'))}]</p>`);
      else if (st.unreviewed) parts.push(`<p class="draft-flag">[${esc(t('Udkast, ikke gennemgået af rådgiver'))}]</p>`);
      else if (st.reviewed) parts.push(`<p class="reviewed">${esc(t('Gennemgået af'))} ${esc(st.reviewed.by)}, ${esc(fmtWhen(st.reviewed.at))}</p>`);
      parts.push(prepareForExport(htmlOf(s.k), docLang));
    }

    // Interne noter følger kun med hvis brugeren beder om det. Hele sporet,
    // også løste og trukne tilbage, med hvem, hvornår og hvorfor.
    if (opts.comments) {
      // Indstillet: det frosne spor, ikke det levende
      const comments = lockedSecs && lockedSecs.__comments ? (lockedSecs.__comments[s.k] || []) : loadComments(s.k);
      if (comments.length > 0) {
        parts.push(`<h3>${esc(t('Interne kommentarer'))} (${comments.length})</h3>`);
        comments.forEach(c => {
          const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
          const st = commentState(c);
          const tail = st === 'resolved'
            ? (c.release ? `<div class="cmt-meta">${esc(t('Svar fra'))} ${esc(c.release.by)}, ${esc(fmtWhen(c.release.at))}: ${esc(t(c.release.text || ''))}</div>` : '')
              + `<div class="cmt-meta">${esc(c.resolved.dept ? t('Frigivet af') : t('Løst af'))} ${esc(c.resolved.by)}, ${esc(fmtWhen(c.resolved.at))}: ${esc(t(c.resolved.reason || ''))}</div>`
            : st === 'withdrawn' ? `<div class="cmt-meta">${esc(t('Trukket tilbage af'))} ${esc(c.withdrawn.by)}, ${esc(fmtWhen(c.withdrawn.at))}</div>`
            : isBlockingComment(c) ? `<div class="cmt-meta"><strong>${esc(t('Blokerer indstilling'))}</strong></div>` : '';
          parts.push(`<div class="cmt-box"><div class="cmt-meta"><span class="cmt-dept">${esc(c.author)}</span> · ${esc(t(d.label))} · ${esc(commentWhen(c))}</div>${esc(t(c.text)).replace(/\n/g, '<br/>')}${tail}</div>`);
        });
      }
    }
  });

  parts.push(`</body></html>`);
  const html = parts.join('\n');
  // Til de automatiske browsertests: det der faktisk blev skrevet i filen
  try { window.__memoLastExport = html; } catch (e) {}
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = t('Kreditindstilling') + '-' + coName.replace(/[^A-Za-z0-9æøåÆØÅ]+/g, '-').replace(/-+$/, '') + '.doc';
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
  const boxRef = React.useRef(null);
  CW.useDialog(boxRef, true, onCancel);

  return (
    <div onMouseDown={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', zIndex: 10000, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div ref={boxRef} role="dialog" aria-modal="true" aria-label={t('Generér memoet')}
        onMouseDown={e => e.stopPropagation()}
        style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
        <div style={{ padding: '20px 24px 12px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Generér memoet')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.55 }}>
            {t('Hvert afsnit skrives ud fra sagens dokumenter, de realiserede periodetal og årsregnskaberne. Teksten kommer med kildehenvisninger, så du kan se hvor hvert tal stammer fra.')}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px 8px' }}>
          <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>{chosen.length} {t('af')} {sections.length} {t('valgt')}</span>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm btn-ghost" onClick={() => setAll(true)}>{t('Vælg alle')}</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setAll(false)}>{t('Fravælg alle')}</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--c-line-2)', borderBottom: '1px solid var(--c-line-2)' }}>
          {sections.map(s => (
            <label key={s.k}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', cursor: 'pointer', fontSize: 12.5, borderBottom: '1px solid var(--c-line-2)' }}>
              <input type="checkbox" checked={!!picked[s.k]} onChange={() => toggle(s.k)}/>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--c-text-4)', width: 22 }}>{s.num}</span>
              <span style={{ flex: 1, color: 'var(--c-ink)' }}>{t(s.label)}</span>
              {modified[s.k] && (
                <span style={{ fontSize: 10.5, color: 'var(--c-warn)', background: 'var(--c-warn-bg)', borderRadius: 4, padding: '1px 6px' }}>{t('redigeret')}</span>
              )}
            </label>
          ))}
        </div>

        <div style={{ padding: '14px 24px 18px' }}>
          {overwritten.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--c-warn)', background: 'var(--c-warn-bg)', border: '1px solid #f4dfb7', borderRadius: 8, padding: '8px 11px', marginBottom: 12, lineHeight: 1.5 }}>
              {overwritten.length} {t('af de valgte afsnit er redigeret manuelt. De bliver overskrevet. Du kan fravælge dem ovenfor.')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm" onClick={onCancel}>{t('Annullér')}</button>
            <button className="btn btn-sm btn-primary" disabled={!chosen.length}
              onClick={() => onStart(chosen.map(s => s.k))}>
              {t('Skriv')} {chosen.length} {t('afsnit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Viser kildedokumentet på den side en henvisning peger på. Den citerede
   passage fremhæves, hvis den kan findes i teksten, så man ikke skal lede. */
/* Sammenligner uden at snuble over store og små bogstaver, mellemrum og
   bindestreger, men husker hvor hvert tegn kom fra, så fundet kan fremhæves
   i den oprindelige tekst. */
function _normWithMap(s) {
  let out = '';
  const map = [];
  let prevSpace = true;
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === ' ') {
      if (prevSpace) continue;
      c = ' '; prevSpace = true;
    } else {
      prevSpace = false;
      c = c.toLowerCase();
      if (c === '−' || c === '–' || c === '—') c = '-';
    }
    out += c; map.push(i);
  }
  if (out.endsWith(' ')) { out = out.slice(0, -1); map.pop(); }
  return { text: out, map };
}

/* Et citat bekræftes kun ved en sammenhængende tekst. Et rent tal som "2025"
   findes på næsten enhver side og beviser intet. */
function _isPhrase(q) {
  return (q || '').trim().length >= 4 && /[a-zæøåäöü]{3,}/i.test(q);
}

/** Finder citatet ordret på en side. Returnerer [start, slut] i sidens tekst, eller null. */
function findQuote(text, quote) {
  if (!text || !_isPhrase(quote)) return null;
  const hay = _normWithMap(text);
  const needle = _normWithMap(quote).text;
  if (!needle) return null;
  const isWordChar = (c) => !!c && /[0-9a-zæøåäöü]/i.test(c);
  let from = 0;
  while (true) {
    const at = hay.text.indexOf(needle, from);
    if (at === -1) return null;
    const end = at + needle.length;
    // Ingen halve ord: "2025" må ikke findes inde i "20250"
    if (!isWordChar(hay.text[at - 1]) && !isWordChar(hay.text[end])) {
      return [hay.map[at], hay.map[end - 1] + 1];
    }
    from = at + 1;
  }
}

/* ── Kildekontrol ────────────────────────────────────────────────────────────
   Tre udfald for en kildehenvisning:
   'exact'   Teksten står ordret på siden. Grøn, fremhævet.
   'format'  Alle tal (og koder) i påstanden står på siden, men i et andet
             format eller i en tabel: 41,1 mio. = t.DKK 41.100 = 41.100.000,
             50,7 % = 50,7%. Grøn med en note, tallene fremhævet.
   'missing' Påstanden kan ikke genfindes. Gul, gennemgå selv.
   En ren etiket ("note 14", "ejerbogen") beviser intet i sig selv og giver
   aldrig grønt alene. Så kontrolleres påstanden foran den i sætningen.
   ──────────────────────────────────────────────────────────────────────────── */

const _CITE_MONTHS = {
  januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

/* Referencer til steder i et dokument. De er ikke påstande og tælles ikke som tal. */
const _CITE_REF_RE = /(§\s?\d+(?:\.\d+)*(?:\s?(?:og|and|,)\s?§?\s?\d+(?:\.\d+)*)*|\b(?:note|noter|notes|afsnit|section|sections|pkt\.?|punkt|item|clause|s\.|p\.|pp\.|side|page|linje|line|bemærkning|remark|rk\.)\s?\d+(?:[.-]\d+)*|\bS\d\b|\b(?:ark|sheet)\s+[A-ZÆØÅ][\wæøå]+|\bQ[1-4](?:\s?-\s?Q[1-4])?\b|\bTop-\d+\b|\bDL-\d+\b|\bISO\s?\d+\b|\bversion\s\d+(?:\.\d+)?)/gi;
/* Koder der skal stå ordret: aftalenumre, sagsnumre */
const _CITE_CODE_RE = /\b[A-Z]{2,}(?:-[A-Z0-9]+){2,}\b/g;

/* Almindelige navne på dokumenter og dokumentdele. En henvisning, der kun
   består af sådanne ord, er en etiket. */
const _CITE_LABEL_WORDS = [
  'ledelsesberetning', 'ejerbog', 'ansøgning', 'revisionspåtegning', 'påtegning', 'ledelsesoversigt', 'ejeraftale',
  'selskabsoplysning', 'nøgletal', 'budget', 'forudsætning', 'periodetal', 'likviditetsprognose', 'ordrebog',
  'rammeaftale', 'rammekontrakt', 'koncernoversigt', 'redegørelse', 'årsrapport', 'aarsrapport', 'windeurope', 'note', 'noter',
  'sikkerhedsdokument', 'kontrakt', 'regnskab', 'ejerfortegnelse', 'csr/esg', 'esg',
  'management', 'review', 'register', 'shareholders', 'shareholder', 'application', 'audit', 'report', 'auditor',
  'assumptions', 'interim', 'figures', 'liquidity', 'forecast', 'order', 'book', 'framework', 'agreement', 'company',
  'details', 'overview', 'group', 'key', 'annual', 'statement', 'security', 'documents', 'contract',
];

function _citeStem(w) {
  w = w.toLowerCase().replace(/^[^a-zæøå0-9/]+|[^a-zæøå0-9/]+$/g, '').replace(/'s$/, '');
  return w.replace(/(ernes|erne|enes|ene|ets|ens|en|et|ne|er|s)$/, '');
}

/** Er henvisningsteksten kun en etiket (dokument- eller sidenavn)? */
function _citeIsLabel(quote, doc, pageRef) {
  // Et kort navneord, der står i selve siden ("prioritetsoversigten"), er en
  // henvisning til en del af dokumentet, ikke en påstand
  const bare = (quote || '').trim();
  if (bare && !/\d/.test(bare) && bare.split(/\s+/).length <= 2 && doc && doc.pages) {
    const pg = doc.pages.find(p => p.ref === pageRef);
    const stem = _citeStem(bare.split(/\s+/).pop());
    if (pg && stem.length >= 7 && (pg.body || '').toLowerCase().indexOf(stem) >= 0 && /(en|et|ne|erne)$/i.test(bare)) return true;
  }
  const rest = (quote || '').replace(_CITE_REF_RE, ' ');
  // Tal i henvisningen gør den til en påstand, medmindre tallet er en del af dokumentets navn
  const docWords = ((doc && doc.name) || '').toLowerCase().split(/[^a-zæøå0-9]+/);
  if (rest.split(/[^\wæøå]+/i).some(w => /\d/.test(w) && !docWords.includes(w.toLowerCase()))) return false;
  const vocab = []
    .concat(_CITE_LABEL_WORDS)
    .concat(docWords)
    .concat(((doc && doc.type) || '').toLowerCase().split(/[^a-zæøå0-9]+/))
    .concat(((doc && doc.pages) || []).map(p => (p.title || '').toLowerCase()).join(' ').split(/[^a-zæøå0-9/]+/))
    .filter(w => w && w.length >= 3);
  const words = rest.split(/[\s,;:()]+/).filter(w => w && w.replace(/[^a-zæøå0-9]/gi, '').length >= 4);
  if (!words.length) return true;
  return words.every(w => {
    if (/\d/.test(w)) return vocab.some(v => v === w.toLowerCase());
    const s = _citeStem(w);
    if (s.length < 3) return true;
    return vocab.some(v => v.startsWith(s) || (v.length >= 5 && s.startsWith(v)) || (v.includes(s) && s.length >= 6));
  });
}

/** Læser et tal i dansk format: "41.100" = 41100, "41,1" = 41,1, "1.000.000" */
function _citeParseNum(raw, en) {
  let s = raw.replace(/\s/g, '');
  // Engelsk format i memoets engelske tekst: "1,245,000" og "4.5". Kilderne er danske.
  if (en) {
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  }
  else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3}){2,}(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const v = parseFloat(s);
  if (isNaN(v)) return null;
  return { v, dec: (s.split('.')[1] || '').length };
}

// Et tal med evt. enhed foran eller bagved
const _CITE_NUM_RE = /(t\.?\s?DKK|tDKK|TDKK|DKK|USD|EUR|kr\.?)?\s?([+\-−]?\d{1,3}(?:\.\d{3})+(?:,\d+)?|[+\-−]?\d+(?:[.,]\d+)?)(\s?(?:mio\.?|million|mia\.?|billion|bn|mdr\.?|måneder|months|k\b|t\.?kr\.?|%|×|x\b|pct\.?|procent|per cent|percent))?/gi;
// Også "1. nov. 2026" og "30. september" uden år
const _CITE_DATE_DA = /(\d{1,2})\.\s?(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|okt|nov|dec)\b\.?(?:\s(\d{4}))?/gi;
const _CITE_DATE_EN = /(\d{1,2})\s(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b\.?(?:\s(\d{4}))?/g;
const _CITE_DATE_NUM = /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;

function _citeDates(text) {
  const out = [];
  let m;
  const push = (d, mo, y, i, len) => out.push({ key: (y || '*') + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'), start: i, end: i + len });
  _CITE_DATE_DA.lastIndex = 0;
  while ((m = _CITE_DATE_DA.exec(text))) push(+m[1], _CITE_MONTHS[m[2].toLowerCase()], m[3], m.index, m[0].length);
  _CITE_DATE_EN.lastIndex = 0;
  while ((m = _CITE_DATE_EN.exec(text))) push(+m[1], _CITE_MONTHS[m[2].toLowerCase()], m[3], m.index, m[0].length);
  _CITE_DATE_NUM.lastIndex = 0;
  while ((m = _CITE_DATE_NUM.exec(text))) {
    if (m[4]) push(+m[6], +m[5], m[4], m.index, m[0].length);
    else push(+m[1], +m[2], m[3], m.index, m[0].length);
  }
  return out;
}

/** Alle tal og datoer i en tekst: { raw, v, dec, scale, kind, date?, start, end } */
function _citeNumbers(text, en) {
  const out = [];
  const dates = _citeDates(text);
  const inDate = (i) => dates.some(d => i >= d.start && i < d.end);
  let m;
  _CITE_NUM_RE.lastIndex = 0;
  while ((m = _CITE_NUM_RE.exec(text))) {
    const numStart = m.index + m[0].indexOf(m[2]);
    // "1.11.2026-30.4.2029": bindestregen er ikke et minus, tallet er en dato
    if (inDate(numStart) || inDate(numStart + (/^[+\-−]/.test(m[2]) ? 1 : 0))) continue;
    // Tal inde i ord og koder ("CO2", "Q3") er ikke beløb
    const prev = text[numStart - 1] || '';
    const next = text[numStart + m[2].length] || '';
    if (/[A-Za-zÆØÅæøå\-_/]/.test(prev) && !/[+−\-]/.test(m[2][0])) continue;
    if (/[A-Za-zÆØÅæøå_]/.test(next) && !m[3]) continue;
    // Ordenstal ("1. kvartal", "12. regnskabsår") er ikke påstande om beløb
    if (!m[1] && !m[3] && /^\d{1,2}$/.test(m[2]) && /^\.\s+[a-zæøå]/.test(text.slice(numStart + m[2].length))) continue;
    // "6-8 mio.": bindestregen mellem to tal er et interval, ikke et minus
    const raw2 = /^[\-−]/.test(m[2]) && /\d/.test(prev) ? m[2].slice(1) : m[2];
    const p = _citeParseNum(raw2.replace('−', '-').replace(/^\+/, ''), en);
    if (!p) continue;
    const unit = (m[3] || '').trim().toLowerCase();
    const pre = (m[1] || '').toLowerCase().replace(/\s/g, '');
    let scale = 1, kind = 'n';
    if (/^(mio|million)/.test(unit)) scale = 1e6;
    else if (/^(mia|billion|bn)/.test(unit)) scale = 1e9;
    else if (unit === 'k' || /^t\.?kr/.test(unit) || /^t\.?dkk/.test(pre)) scale = 1e3;
    if (/%|pct|procent|cent/.test(unit)) kind = '%';
    else if (/×|^x$/.test(unit)) kind = 'x';
    else if (scale !== 1 || pre) kind = 'amt';
    out.push({ raw: m[0].trim(), v: p.v, dec: p.dec, scale, kind, start: numStart, end: m.index + m[0].length });
  }
  // Datoer tæller både som dato og som årstal ("2025" står i "31. december 2025")
  dates.forEach(d => {
    out.push({ raw: text.slice(d.start, d.end), date: d.key, start: d.start, end: d.end });
    if (d.key[0] !== '*') out.push({ raw: d.key.slice(0, 4), v: +d.key.slice(0, 4), dec: 0, scale: 1, kind: 'n', start: d.start, end: d.end });
  });
  return out;
}

/** Passer et tal fra påstanden med et tal på siden, evt. i en anden enhed eller afrundet? */
function _citeNumEq(c, p) {
  // En dato uden år ("30. september") passer med samme dag og måned
  if (c.date || p.date) return !!(c.date && p.date && (c.date === p.date || ((c.date[0] === '*' || p.date[0] === '*') && c.date.slice(-5) === p.date.slice(-5))));
  const tol = 0.5 * Math.pow(10, -c.dec) + 1e-9;
  const cv = Math.abs(c.v) * c.scale;
  // Samme størrelse direkte, eller i en anden enhed (DKK mio. / t.DKK / kr.)
  const scales = c.kind === '%' || c.kind === 'x' ? [1] : [1, 1e3, 1e6, 1e-3, 1e-6];
  for (const s of scales) {
    // Et lille helt tal uden enhed ("§ 2", "2 af 5") er ikke et beløb i mio.
    if (s !== 1 && p.kind === 'n' && p.dec === 0 && (Math.abs(p.v) < 100 || _citeIsYear(p))) continue;
    const pv = Math.abs(p.v) * p.scale * s;
    if (Math.abs(pv - cv) <= tol * c.scale + 1e-9) {
      // Et helt tal uden decimaler (fx "3") må ikke findes inde i en afrunding ("3,4")
      if (c.dec === 0 && p.dec > 0 && c.kind !== 'amt' && Math.abs(pv - cv) > 1e-9) continue;
      return true;
    }
  }
  return false;
}

/* Sætningsgrænse efter punktum, semikolon, udråbs- og spørgsmålstegn? Ikke
   foran småt, tal eller parentes, ikke efter forkortelser midt i en sætning
   ("jf.", "ca.", "maks.") og ikke efter "mio." foran en valuta ("mio. DKK").
   "... DKK 1,8 mio. EIFO er sidestillet" er derimod to sætninger. */
const _CITE_ABBR_MID = /(^|[^\wæøå])(ca|maks|min|pkt|nr|jf|inkl|ekskl|s|t|approx|max|no|p|pp|incl|excl|bl\.a|f\.eks|e\.g|i\.e|stk|adm|att|evt|vedr|dvs|hhv|kl)\.$/i;
const _CITE_ABBR_END = /(^|[^\wæøå])(mio|mia|kr|mdr|pct)\.$/i;
function _citeIsBoundary(head, rest) {
  const c = (rest || '')[0] || '';
  if (!c || c === '(') return false;
  if (/\.$/.test(head)) {
    if (/[0-9a-zæøå]/.test(c)) return false;
    if (_CITE_ABBR_MID.test(head)) return false;
    if (_CITE_ABBR_END.test(head) && /^(DKK|USD|EUR|GBP|NOK|SEK|kr)\b/.test(rest)) return false;
    // Initialer: "A. Christensen"
    if (/(^|\s)[A-ZÆØÅ]\.$/.test(head)) return false;
  }
  return true;
}

/**
 * Teksten en henvisning står i, uden de andre henvisningers tekst:
 * { before, after, row }. I en tabel er rækken påstanden, når cellen kun er
 * en kildeangivelse; står henvisningen i en lang tekstcelle, er det sætningen.
 */
function citeContext(el) {
  // Indstillingsboksen viser en kort tekst; påstanden er faktaarkets fulde tekst
  const claim = el.getAttribute && el.getAttribute('data-claim');
  if (claim) return { before: claim + ' ', after: '', row: true, label: true };
  const cell = el.closest('td, th');
  // Et punkt i en liste i en celle (indstillingsboksen) er sin egen påstand
  const li = el.closest('li');
  let block = li && (!cell || cell.contains(li))
    ? li
    : cell
    ? ((cell.textContent || '').replace(el.textContent || '', '').trim().length > 40 ? cell : el.closest('tr'))
    : el.closest('li, p, blockquote, h3, h4, dd, dt');
  if (!block) block = el.parentElement;
  if (!block) return { before: '', after: '', row: false };
  const row = block.tagName === 'TR';
  let text = '', at = -1, end = -1;
  const walk = (node) => {
    if (node.nodeType === 3) { text += node.nodeValue; return; }
    if (node.nodeType !== 1) return;
    // Statusmærker ("Åben", "Høj") er ikke en del af påstanden
    if (node.classList && node.classList.contains('st')) return;
    if (node.classList && node.classList.contains('memo-cite')) {
      if (node === el) { at = text.length; text += node.textContent; end = text.length; }
      else text += ' \u0001 ';
      return;
    }
    if (node.tagName === 'TD' || node.tagName === 'TH' || node.tagName === 'BR') text += ' | ';
    node.childNodes.forEach(walk);
  };
  walk(block);
  if (at < 0) return { before: '', after: '', row };
  if (row) {
    // I en tabel hører kolonnens overskrift ("2025") til påstanden
    const cellEl = el.closest('td, th');
    const table = block.closest('table');
    const headRow = table && table.querySelector('thead tr');
    const idx = cellEl ? Array.prototype.indexOf.call(block.children, cellEl) : -1;
    const head = headRow && idx > 0 && headRow.children[idx] ? (headRow.children[idx].textContent || '').trim() : '';
    return { before: (head ? head + ' | ' : '') + text.slice(0, at), after: text.slice(end), row };
  }
  // Sætningsgrænser: punktum, semikolon, udråbs- og spørgsmålstegn. Ikke efter
  // forkortelser som "mio." foran "DKK" eller et tal, og ikke foran en parentes.
  const bounds = [];
  const re = /[.;!?](\s+)(?=\S)/g;
  let m;
  while ((m = re.exec(text))) {
    if (!_citeIsBoundary(text.slice(0, m.index + 1), text.slice(m.index + 1 + m[1].length))) continue;
    bounds.push(m.index + 1);
  }
  const sStart = bounds.filter(b => b <= at).pop() || 0;
  const sEnd = bounds.find(b => b >= end) || text.length;
  let before = text.slice(sStart, at);
  // "(S1 og S2)": står der kun et bindeord mellem to henvisninger, gælder
  // påstanden foran den første for dem begge
  let parts = before.split('\u0001');
  while (parts.length > 1 && /^[\s,;()]*(og|and|samt|,)?[\s,;()]*$/i.test(parts[parts.length - 1])) parts.pop();
  before = parts[parts.length - 1];
  let after = text.slice(end, sEnd);
  const nextOther = after.indexOf('\u0001');
  if (nextOther >= 0) after = after.slice(0, nextOther);
  // Efter et kolon begynder en opremsning, der kan have sine egne kilder
  const colon = after.indexOf(':');
  if (colon >= 0) after = after.slice(0, colon);
  return { before, after, row };
}

/** Det der skal kunne genfindes: tal, datoer og koder */
function _citeTokens(text, en) {
  const clean = (text || '').replace(_CITE_REF_RE, ' ');
  const codes = [];
  let m;
  _CITE_CODE_RE.lastIndex = 0;
  while ((m = _CITE_CODE_RE.exec(clean))) codes.push(m[0]);
  return { nums: _citeNumbers(clean.replace(_CITE_CODE_RE, ' '), en), codes };
}

/* Egennavne og e-mails i en påstand uden tal: ord med stort begyndelsesbogstav.
   Det første ord i sætningen kan være et almindeligt ord med stort, så det
   tæller kun med, hvis det findes. */
function _citeNames(text) {
  const words = (text || '').replace(_CITE_REF_RE, ' ').split(/[\s,;:()"“”]+/).filter(Boolean);
  const out = [];
  words.forEach((w, i) => {
    const clean = w.replace(/[^\wæøåÆØÅ/.@-]/g, '').replace(/\.$/, '');
    if (clean.length < 3) return;
    if (/@/.test(clean)) { out.push({ n: clean, opt: false }); return; }
    // Første ord i sætningen (evt. efter et punkt-id som "E1") kan være almindeligt
    const first = i === 0 || (i === 1 && /^[A-Z]\d{1,2}$/.test(words[0]));
    if (/^[A-ZÆØÅ][a-zæøå]+/.test(clean) || /^[A-ZÆØÅ]{2,}/.test(clean)) out.push({ n: clean, opt: first });
  });
  return out;
}

/* ── Sammenhæng i kilden ─────────────────────────────────────────────────────
   Et tal, der står et sted på siden, beviser ikke påstanden. Grønt kræver, at
   tallet står i samme sætning, linje eller tabelrække som påstandens
   nøgleord, og at nøgleordet hører til netop det tal: i en sætning skal
   nøgleordets nærmeste tal af samme slags være påstandens. Derfor bliver
   "Anders Holding ApS (23,6 %)" ikke grøn, fordi 23,6 står ud for
   Erhvervsfonden. Ord som efterstillet, sidestillet og personlig kaution skal
   desuden have samme fortegn i kilden: "ikke efterstillet" modsiger
   "efterstillet".
   ──────────────────────────────────────────────────────────────────────────── */

/* Kildens enheder: en tabellinje (kolonner adskilt af flere mellemrum) er én
   enhed; en tekstlinje deles i sætninger og ved " · ". En tabellinje kender
   sin tabel (block) og tabellens overskrift og kolonnehoved (caps). */
function _citeUnits(body) {
  const units = [];
  let pos = 0;
  const lines = (body || '').split('\n').map(line => { const l = { start: pos, end: pos + line.length, text: line }; pos += line.length + 1; return l; });
  const isTable = (l) => /\S {3,}\S/.test(l.text) || /\t/.test(l.text);
  let block = null;
  lines.forEach((l, i) => {
    const line = l.text, start = l.start;
    if (!line.trim()) return;
    if (isTable(l)) {
      if (!block || block.last !== i - 1) {
        // Ny tabel: op til to tekstlinjer lige over den er dens overskrift
        // Kun korte overskrifter uden beløb; brødtekst over tabellen er ikke
        // dens titel og springes over, og tekst med beløb afslutter søgningen
        const caps = [];
        for (let j = i - 1, seen = 0; j >= 0 && caps.length < 2 && seen < 3; j--) {
          if (!lines[j].text.trim()) continue;
          if (isTable(lines[j]) || /\d[.,]\d|mio|pct|%/i.test(lines[j].text)) break;
          seen++;
          if (lines[j].text.length <= 90) caps.push({ start: lines[j].start, end: lines[j].end });
        }
        block = { start, end: l.end, head: { start, end: l.end }, caps };
      }
      block.last = i; block.end = l.end;
      units.push({ start, end: l.end, table: true, block });
      return;
    }
    const re = /(?:[.;!?]|\s·)(\s+)(?=\S)/g;
    let m, s = 0;
    while ((m = re.exec(line))) {
      const cut = m.index + m[0].length - m[1].length;
      const rest = line.slice(m.index + m[0].length);
      if (m[0].trim()[0] !== '·' && !_citeIsBoundary(line.slice(0, cut), rest)) continue;
      units.push({ start: start + s, end: start + cut, table: false });
      s = m.index + m[0].length;
    }
    units.push({ start: start + s, end: start + line.length, table: false });
  });
  return units;
}

// Ord, der ikke siger noget om, hvad tallet handler om
const _CITE_STOPW = new Set(('ikke efter under mellem samt eller også over hvor hvis samlet samlede heraf herudover svarende udgør udgjorde udgøre ' +
  'bliver blev have havde alene cirka omkring dette denne disse deres hans hendes sine inden uden siden ifølge fordi derfor ' +
  'nemlig altså dermed således tillige desuden herunder blandt senest seneste første sidste hele helt meget mere mest flere færre andre anden ' +
  'andet samme egen egne eget nogen noget nogle hver alle ingen intet være været står stod giver viser siger mens idet endnu stadig igen ' +
  'allerede kunne skal skulle ville måtte ligger kommer komme gælder fremgår nævner anfører oplyser skriver bekræfter medio ultimo primo året ' +
  'årets periode perioden dato side sider afsnit note noter linje punkt bilag memoet kilde kilden kilderne nordhavn composite selskab selskabet ' +
  'selskabets aps mod ved til fra med som den det der har var kan får fået efterfølgende tidligere senere ' +
  'the and with from which this that these those than then there their only also into about approx approximately after before between ' +
  'including total while where when been being have has had will would should could shall must each other same such more most less least ' +
  'both either first last since until page pages section sections line sheet company memo source ' +
  'dkk usd eur gbp nok sek mio mia million millions millioner billion pct procent percent mdr måneder months thousand tusind').split(' '));

/** Påstandens nøgleord med placering: { w (små bogstaver), start, end } */
function _citeWords(text) {
  const out = [];
  const re = /[A-Za-zÆØÅæøåÄÖÜäöü]+/g;
  let m;
  while ((m = re.exec(text || ''))) {
    const raw = m[0], w = raw.toLowerCase();
    const acro = raw.length >= 3 && raw === raw.toUpperCase();
    if ((w.length >= 4 || acro) && !_CITE_STOPW.has(w)) out.push({ w, start: m.index, end: m.index + raw.length, name: /^[A-ZÆØÅ]/.test(raw) });
  }
  return out;
}

/* Samme ord i en anden bøjning eller som del af et sammensat ord:
   "nettoomsætningen" = "Nettoomsætning", "EIFO-kautionen" ~ "eksportkaution" */
function _citeWordEq(w, s) {
  const stem = w.length <= 5 ? w : w.slice(0, Math.max(5, w.length - 3));
  if (s.startsWith(stem)) return true;
  if (stem.length >= 6 && s.indexOf(stem) >= 0) return true;
  // Ordet som sidste led i et sammensat ord: "præmie" i "kautionspræmie"
  const at = stem.length >= 5 ? s.indexOf(stem, 3) : -1;
  if (at > 0 && s.length - at <= w.length + 2) return true;
  // Kildens ord er en kortere form af påstandens ("nettoomsætning" i "nettoomsætningen")
  if (s.length >= 10 && w.startsWith(s.slice(0, s.length - 3))) return true;
  // Sidste led i et sammensat ord: "selvskyldnerkaution" ~ "kautionsforpligtelsen"
  const base = _citeStem(w);
  if (base.length >= 11 && s.startsWith(base.slice(-7, -1))) return true;
  // Kildens ord er sidste led i påstandens: "koncentration" i "kundekoncentration"
  if (s.length >= 8 && w.indexOf(s.slice(0, Math.max(7, s.length - 3)), 2) > 0) return true;
  return false;
}

/* Ord med fortegn. Samme gruppe, andet udfald er en modsigelse. */
const _CITE_POLAR = [
  { g: 'rank', v: 'sub', re: /efterstil\w*|subordinat\w*|tilbagetræd\w*/g },
  { g: 'rank', v: 'pari', re: /sidestil\w*|sideordn\w*|ligestil\w*|pari passu|ranking equally|rank\w* pari passu/g },
  { g: 'rank', v: 'senior', re: /foranstil\w*|forlods\w*/g },
  // En kautionist med cpr-nummer er en person, en med CVR-nummer et selskab
  { g: 'guar', v: 'personal', re: /personlig\w*\s+(?:[\wæøå]+\s+)?[\wæøå]*kaution\w*|personal\s+(?:\w+\s+)?guarantee\w*|kautionist\w*[^.]{0,60}?cpr/g },
  { g: 'guar', v: 'company', re: /selskabskaution\w*|(?:company|corporate)\s+guarantee\w*|kautionist\w*[^.]{0,60}?cvr/g },
];
const _CITE_NEG_BEFORE = /(?:^|[^a-zæøå])(ikke|ej|not|no|uden|aldrig|never|ingen|intet|without)$/;
const _CITE_NEG_AFTER = /^(ikke|mangler|missing|not)(?:[^a-zæøå]|$)/;

/** Ord med fortegn i et tekststykke: { g, v, neg, start, end }. Nægtelsen må stå op til tre ord før eller lige efter. */
function _citePolarTerms(text, from, to) {
  const low = (text || '').toLowerCase();
  const out = [];
  _CITE_POLAR.forEach(p => {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(low))) {
      const s = m.index, e = s + m[0].length;
      if (from != null && (s < from || s >= to)) continue;
      const pre = low.slice(0, s).split(/\s+/).filter(Boolean).slice(-3);
      // En betingelse ("medmindre der foreligger", "medregnes ikke uden") siger
      // intet om, hvordan det er
      const bare = pre.map(w => w.replace(/[^a-zæøå]/g, ''));
      if (bare.some(w => /^(medmindre|hvis|såfremt|unless|if)$/.test(w)) || /ikke uden$/.test(bare.join(' '))) continue;
      const neg = pre.some(w => _CITE_NEG_BEFORE.test(' ' + w.replace(/[^a-zæøå]/g, ''))) ||
        _CITE_NEG_AFTER.test(low.slice(e).replace(/^[\s,]+/, ''));
      out.push({ g: p.g, v: p.v, neg, start: s, end: e, text: (text || '').slice(s, e) });
    }
  });
  return out;
}

/* Understøtter kilden ordene med fortegn? 'ok' | 'contra' | 'unsupported' | null (ingen).
   Først i de sætninger, tallene blev fundet i; ellers på hele siden. info får
   det omstridte ord i påstanden (term) og stedet i kilden (src).
   Prioritet skal kilden bekræfte; om en kaution er personlig, er kun en fejl,
   hvis kilden siger det modsatte. */
function _citePolarity(claimTerms, body, units, allUnits, info) {
  if (!claimTerms.length) return null;
  const termsIn = (us) => [].concat.apply([], us.map(u => _citePolarTerms(body.slice(u.start, u.end)).map(x => Object.assign(x, { u }))));
  const supports = (c, x) => x.g === c.g && (x.v === c.v ? x.neg === c.neg : (c.neg && !x.neg));
  const contradicts = (c, x) => x.g === c.g && (x.v === c.v ? x.neg !== c.neg : (!c.neg && !x.neg));
  const phrase = (x) => {
    const t = body.slice(x.u.start, x.u.end);
    const a = Math.max(0, t.lastIndexOf(' ', Math.max(0, x.start - 22))), b = t.indexOf(' ', Math.min(t.length, x.end + 12));
    return (a > 0 ? '… ' : '') + t.slice(a, b < 0 ? t.length : b).replace(/\s+/g, ' ').trim() + (b >= 0 ? ' …' : '');
  };
  let verdict = 'ok';
  claimTerms.forEach(c => {
    if (verdict === 'contra') return;
    const near = termsIn(units);
    if (near.some(x => supports(c, x))) return;
    let bad = near.find(x => contradicts(c, x));
    if (!bad) {
      // På hele siden, også hen over linjeskift ("KAUTIONIST / Anders Christensen, cpr.nr.")
      const all = termsIn([{ start: 0, end: body.length }]);
      if (all.some(x => supports(c, x))) return;
      bad = all.find(x => contradicts(c, x));
    }
    if (info) info.term = c.text;
    if (bad) { verdict = 'contra'; if (info) info.src = phrase(bad); return; }
    if (c.g === 'rank') verdict = 'unsupported';
  });
  return verdict;
}

/* Påstanden, der skal kontrolleres: hele sætningen (text) og den del af den,
   hvis tal skal findes (from-to). For en etiket er det sætningen foran den. */
function _citeClaim(quote, label, ctx) {
  const before = (ctx.before || '').replace(/\u0001/g, ' '), after = (ctx.after || '').replace(/\u0001/g, ' ');
  const has = (x) => { const k = _citeTokens(x); return k.nums.length || k.codes.length; };
  if (!label) return { text: before + quote + after, from: before.length, to: before.length + quote.length };
  // (label: true nedenfor: tal efter en etiket er ikke en ekstra påstand)
  // Etikettens egne ord ("ansøgningen, afsnit 1.1") er ikke en del af påstanden
  const text = before + ' ' + after;
  if (has(before)) return { text, from: 0, to: before.length, label: true };
  if (has(after)) return { text, from: before.length + 1, to: text.length, label: true };
  return { text, from: 0, to: text.length, none: true, label: true };
}

/* Tidsord: måneder og årstal. En hel dato tæller med sin måned og sit år.
   → { months: [{ v, start, end, date? }], years: [...] } */
const _CITE_MONTH_WORD = /(?:^|[^a-zæøå])(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|january|february|march|may|june|july|october|jan|feb|mar|apr|jun|jul|aug|sept|sep|okt|oct|nov|dec)(?![a-zæøå])/gi;
function _citeTime(text) {
  const dates = _citeDates(text || '');
  const inDate = (i) => dates.some(d => i >= d.start && i < d.end);
  const months = [], years = [];
  let m;
  _CITE_MONTH_WORD.lastIndex = 0;
  while ((m = _CITE_MONTH_WORD.exec(text || ''))) {
    const at = m.index + m[0].length - m[1].length;
    if (!inDate(at)) months.push({ v: _CITE_MONTHS[m[1].toLowerCase()], start: at, end: at + m[1].length });
  }
  const ry = /(?:^|[^\d.,])((?:19|20)\d\d)(?!\d|[.,]\d)/g;
  while ((m = ry.exec(text || ''))) {
    const at = m.index + m[0].length - 4;
    if (!inDate(at)) years.push({ v: +m[1], start: at, end: at + 4 });
  }
  dates.forEach(d => {
    const k = d.key.split('-');
    months.push({ v: +k[1], start: d.start, end: d.end, date: true });
    if (k[0] !== '*') years.push({ v: +k[0], start: d.start, end: d.end, date: true });
  });
  return { months, years };
}

/* Kolonnens år for et tal i en tabelrække: den nærmeste linje over rækken
   med mindst to årstal og uden decimaltal er kolonnehovedet ("2021  2022 ...").
   Tallet hører til det år, hvis højre kant står nærmest tallets. */
function _citeColYear(body, unit, p) {
  const numEnd = p.start + ((body.slice(p.start).match(/^[+\-−]?\d[\d.,]*/) || [''])[0].replace(/[.,]$/, '')).length;
  let end = unit.start - 1;
  for (let k = 0; k < 30 && end > 0; k++) {
    const start = body.lastIndexOf('\n', end - 1) + 1;
    const line = body.slice(start, end);
    const ys = [];
    const re = /(^|\s)((?:19|20)\d\d)[EBe]?(?=\s|$)/g;
    let m;
    while ((m = re.exec(line))) ys.push({ v: +m[2], end: m.index + m[0].length });
    if (ys.length >= 2 && !/\d,\d|\d\.\d{3}/.test(line)) {
      const col = numEnd - unit.start;
      const best = ys.slice().sort((a, b) => Math.abs(a.end - col) - Math.abs(b.end - col))[0];
      if (Math.abs(best.end - col) <= 6) return best.v;
      // Skæv justering: tæl kolonnerne fra højre
      const row = [];
      const rn = /[+\-−]?\d[\d.,]*/g;
      let q;
      const ut = body.slice(unit.start, unit.end);
      while ((q = rn.exec(ut))) row.push({ start: unit.start + q.index, end: unit.start + q.index + q[0].length });
      const i = row.findIndex(x => x.start <= p.start && x.end >= p.start + 1);
      const fromRight = i < 0 ? -1 : row.length - 1 - i;
      return fromRight >= 0 && fromRight < ys.length ? ys[ys.length - 1 - fromRight].v : null;
    }
    // Brødtekst afslutter søgningen: kolonnehovedet står i tabellen
    if (line.length > 90 && !/\S {3,}\S/.test(line)) break;
    end = start - 1;
  }
  return null;
}

/* Passer tallets tid? Står påstandens måned der, og har tabellen en kolonne
   med påstandens år, eller nævner sætningen påstandens år? En omsætning for
   2025 må ikke bekræftes af tallet i 2024-kolonnen. */
function _citeTimeOk(n, body, unit, p, page) {
  if (n.date) return true;
  if (n.months && n.months.length && page) {
    // Måneden afgøres af siden: står tallet sammen med påstandens måned et
    // sted, er det godt. Står det kun sammen med andre måneder, er det forkert
    // ("lavpunkt 0,93 i december", når kilden har 0,93 i oktober og november).
    // En række uden måned siger ingenting.
    const withN = page.units.filter(u => page.nums.some(q => q.start >= u.start && q.end <= u.end && _citeNumEq(n, q)));
    const ms = withN.map(u => _citeTime(body.slice(u.start, u.end)).months).filter(x => x.length);
    if (ms.length && !ms.some(x => n.months.every(m => x.some(y => y.v === m.v)))) return false;
  }
  if (n.years && n.years.length) {
    const want = n.years.map(y => y.v);
    if (unit.table) {
      const cy = _citeColYear(body, unit, p);
      if (cy != null) return want.includes(cy);
    }
    const ys = _citeTime(body.slice(unit.start, unit.end)).years;
    if (ys.length && !ys.some(y => want.includes(y.v))) return false;
  }
  return true;
}

/* Antal skrevet med ord eller tal foran et navneord: "ingen datterselskaber",
   "tre datterselskaber", "de to primære leverandører". → [{ n, noun, start, end }] */
const _CITE_COUNT = { ingen: 0, intet: 0, nul: 0, 'én': 1, 'ét': 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10,
  no: 0, none: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function _citeCounts(text, digits) {
  const out = [];
  const low = (text || '').toLowerCase();
  const re = digits
    ? /(^|[^a-zæøå0-9,.\-±/])(ingen|intet|nul|én|ét|to|tre|fire|fem|seks|syv|otte|ni|ti|no|none|one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s+([a-zæøå]{5,})/g
    : /(^|[^a-zæøå0-9,.\-±/])(ingen|intet|nul|én|ét|to|tre|fire|fem|seks|syv|otte|ni|ti|no|none|one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-zæøå]{5,})/g;
  let m;
  while ((m = re.exec(low))) {
    const start = m.index + m[1].length;
    out.push({ n: /\d/.test(m[2]) ? +m[2] : _CITE_COUNT[m[2]], noun: m[3], start, end: m.index + m[0].length });
    re.lastIndex = m.index + m[0].length - m[3].length;
  }
  return out;
}

/* Siger kilden et andet antal om det samme? "tre datterselskaber" mod
   "HAR INGEN DATTERSELSKABER". → null eller { term, src } */
function _citeCountContra(claimText, body) {
  const src = _citeCounts(body, true);
  const stem = (x) => x.slice(0, Math.max(5, x.length - 3));
  for (const c of _citeCounts(claimText, false)) {
    const same = src.filter(x => x.noun.startsWith(stem(c.noun)) || c.noun.startsWith(stem(x.noun)));
    if (same.length && !same.some(x => x.n === c.n)) {
      const x = same[0];
      return { term: claimText.slice(c.start, c.end), src: body.slice(x.start, x.end).replace(/\s+/g, ' ') };
    }
  }
  return null;
}

/* Årstal alene ("2021-2025") er tidsangivelser, ofte kolonneoverskrifter. De
   skal stå på siden, men kræver ikke et nøgleord i samme række. */
function _citeIsYear(n) {
  return !n.date && n.kind === 'n' && n.dec === 0 && n.v >= 1990 && n.v <= 2040 && /^\d{4}$/.test(n.raw);
}

/** Tallene i påstanden, med de nøgleord der hører til hvert tal */
function _citeClaimNums(claim, en) {
  const text = claim.text;
  const blank = (s) => s.replace(_CITE_REF_RE, m => ' '.repeat(m.length)).replace(_CITE_CODE_RE, m => ' '.repeat(m.length));
  const all = _citeNumbers(blank(text), en);
  // Et årstal inde i en dato tælles kun som datoen
  const nums = all.filter(n => !(!n.date && all.some(d => d.date && d.start === n.start))).sort((a, b) => a.start - b.start);
  const words = _citeWords(blank(text));
  const within = (a, b) => words.filter(w => w.start >= a && w.end <= b);
  const inRange = nums.filter(n => n.start >= claim.from && n.end <= claim.to);
  // Tal efter henvisningen i samme sætning uden egen kilde ("..., med GE
  // Vernova alene på 38 %") hører også til påstanden, hvis de står i kilden
  const after = claim.label ? [] : nums.filter(n => n.start >= claim.to && !_citeIsYear(n));
  after.forEach(n => { n.secondary = true; });
  const tw = _citeTime(blank(text));
  const bareM = tw.months.filter(x => !x.date), bareY = tw.years.filter(x => !x.date);
  // Tidsord gælder for tallet i samme led; er påstanden ét tal, gælder sætningens
  const single = !claim.label && inRange.filter(n => !_citeIsYear(n)).length === 1;
  const pick = (arr, a, b, self) => {
    const f = (lo, hi) => arr.filter(x => x.start >= lo && x.end <= hi && !(x.start >= self.start && x.end <= self.end));
    const r1 = f(a, b); if (r1.length) return r1;
    return single && !self.secondary ? f(0, text.length) : [];
  };
  const nonYear = nums.filter(x => !_citeIsYear(x));
  let prev = null;
  inRange.concat(after).forEach(n => {
    const i = nums.indexOf(n);
    const prevEnd = i > 0 ? nums[i - 1].end : 0;
    const nextStart = i < nums.length - 1 ? nums[i + 1].start : text.length;
    // Påstandens måned og år for netop dette tal
    const j = nonYear.indexOf(n);
    let tPrev = j > 0 ? nonYear[j - 1].end : 0, tNext = j >= 0 && j < nonYear.length - 1 ? nonYear[j + 1].start : text.length;
    if (claim.label) { tPrev = Math.max(tPrev, claim.from); tNext = Math.min(tNext, claim.to); }
    n.months = pick(bareM, tPrev, tNext, n);
    n.years = pick(bareY, tPrev, tNext, n);
    // Først påstandens egne ord foran tallet, så efter det, så det foregående tals
    const lo = n.secondary ? claim.to : claim.from, hi = n.secondary ? text.length : claim.to;
    let a = within(Math.max(prevEnd, lo), n.start).slice(-6);
    // Det sidste (eller eneste) tal får også ordene efter sig: "64 % af omsætningen"
    const lastOfKind = !inRange.some(m => m.start > n.start && !!m.date === !!n.date && m.kind === n.kind);
    if (!a.length || lastOfKind) {
      const stop = text.slice(n.end, Math.min(nextStart, hi)).search(/[;,]/);
      a = a.concat(within(n.end, stop >= 0 ? n.end + stop : Math.min(nextStart, hi)).slice(0, 4));
    }
    let fromCtx = false, weak = false;
    if (!a.length && prev && prev.anchors.length && !prev.weak) { a = prev.anchors; fromCtx = prev.fromCtx; }
    // Er påstanden kun et tal ("DKK 41,1 mio."), gælder sætningens ord omkring
    // den: de nærmeste foran, også forbi et tal ("vokset fra 19,4 til 41,1")
    if (!a.length) { a = within(0, n.start).slice(-6).concat(within(n.end, nextStart).slice(0, 3)); fromCtx = true; }
    if (!a.length) { a = words.slice(); weak = true; }
    n.anchors = a; n.weak = weak; n.fromCtx = fromCtx;
    prev = n;
  });
  // Tal, der må stå mellem nøgleord og tal i kilden: påstandens egne, og
  // sætningens, når nøgleordene er hentet fra sætningen
  inRange.concat(after).forEach(n => { n.allow = n.fromCtx || n.weak || n.secondary ? nums : inRange; });
  return inRange.concat(after);
}

/** Ordene i et stykke af kilden med placering */
function _citeToks(body, r) {
  const t = body.slice(r.start, r.end).toLowerCase();
  const out = [];
  const re = /[a-zæøåäöü]+/g;
  let m;
  while ((m = re.exec(t))) out.push({ s: m[0], start: r.start + m.index, end: r.start + m.index + m[0].length });
  return out;
}

/* Står tallet i en enhed sammen med et af sine nøgleord? I en tabellinje er
   rækkens tekst nok. I en sætning må der mellem nøgleord og tal kun stå tal,
   som påstanden selv nævner. */
function _citeAnchored(n, claimNums, body, unit, pageNums, page) {
  const uNums = pageNums.filter(p => p.start >= unit.start && p.end <= unit.end);
  const cands = uNums.filter(p => _citeNumEq(n, p));
  if (!cands.length) return null;
  // Kun forekomster med påstandens måned og år (kolonne) tæller
  const candsT = cands.filter(p => _citeTimeOk(n, body, unit, p, page));
  if (!candsT.length) return null;
  const toks = _citeToks(body, unit);
  // I en tabel tæller tabellens overskrift og kolonnehoved med
  if (unit.table && unit.block) [unit.block.head].concat(unit.block.caps).forEach(r => { if (r.start !== unit.start) toks.push.apply(toks, _citeToks(body, r)); });
  const hits = toks.filter(tk => n.anchors.some(a => _citeWordEq(a.w, tk.s)));
  if (!hits.length) return null;
  if (unit.table || n.weak) return { p: candsT[0], words: hits };
  // I en sætning skal nøgleordets nærmeste tal af samme slags være påstandens
  // tal. Tal, påstanden selv nævner, springes over ("80 % (DKK 3,6 mio.)").
  // Kun tal af samme slags konkurrerer: en dato ikke med et beløb, "30 dage"
  // ikke med en dato. Årstal er tidsangivelser.
  const kind = (x) => x.date ? 'date' : x.kind === 'amt' ? 'n' : x.kind;
  const same = uNums.filter(q => kind(q) === kind(n) && !_citeIsYear(q));
  const allow = (n.allow || claimNums).filter(c => c !== n);
  const ok = [];
  let hitP = null;
  hits.forEach(h => {
    const dist = (q) => q.start >= h.end ? q.start - h.end : h.start >= q.end ? h.start - q.end : 0;
    const near = same.slice().sort((a, b) => dist(a) - dist(b))
      .find(q => cands.includes(q) || !allow.some(c => _citeNumEq(c, q)));
    if (near && candsT.includes(near)) { ok.push(h); if (!hitP) hitP = near; }
  });
  return ok.length ? { p: hitP, words: ok } : null;
}

/** Stumper af op til k enheder i træk, mindste først */
function _citeWindows(units, k) {
  const out = [];
  for (let n = 1; n <= k; n++) {
    for (let i = 0; i + n <= units.length; i++) out.push({ start: units[i].start, end: units[i + n - 1].end, table: false });
  }
  return out;
}

/* Påstand uden tal: navne (egennavne, e-mails) eller de bærende ord. Grønt
   kræver, at de står i én og samme sætning eller række i kilden. */
function _citeCheckNames(body, text, units) {
  const names = _citeNames(text);
  const low = body.toLowerCase();
  const variants = (x) => { const v = [x.n]; if (/s$/.test(x.n)) v.push(x.n.slice(0, -1)); if (x.n.indexOf('-') > 0) v.push(x.n.split('-')[0]); return v.filter(n => n.length >= 3).map(n => n.toLowerCase()); };
  const found = [], missing = [];
  names.forEach(x => {
    if (variants(x).some(n => low.indexOf(n) >= 0)) found.push(x);
    else if (!x.opt) missing.push(x.n);
  });
  const strong = found.filter(x => !x.opt);
  if (!strong.length && !missing.length) return _citeCheckWords(body, text, units);
  if (missing.length) return { state: 'missing', hits: [], found: found.map(x => x.n), missing, basis: 'names', units: [] };
  // Den mindste stump (højst tre sætninger eller linjer i træk, fx en
  // underskrift), der rummer alle navnene
  let best = null, bestN = -1;
  _citeWindows(units, 3).forEach(u => {
    const ut = low.slice(u.start, u.end);
    const k = strong.filter(x => variants(x).some(n => ut.indexOf(n) >= 0)).length;
    if (k > bestN) { best = u; bestN = k; }
  });
  const together = best && bestN === strong.length;
  const hits = [];
  const scope = together ? [best] : units;
  scope.forEach(u => {
    const ut = low.slice(u.start, u.end);
    found.forEach(x => variants(x).some(n => { const at = ut.indexOf(n); if (at >= 0) { hits.push([u.start + at, u.start + at + n.length]); return true; } return false; }));
  });
  return { state: together ? 'format' : 'context', hits, found: found.map(x => x.n), missing: [], basis: 'names', units: together ? [best] : [] };
}

/* Sidste udvej for en påstand uden tal og navne: de bærende ord. Står mindst
   tre af dem, og 70 % i alt, i samme sætning i kilden, er påstanden genfundet. */
const _CITE_STOP = ['prioritet', 'facilitet', 'ikke', 'efter', 'under', 'mellem', 'derfor', 'samtidig', 'selskabet', 'selskabets', 'nordhavn', 'hvilket', 'senest', 'desuden', 'blandt', 'nævner', 'største', 'mindste', 'herunder', 'samlet', 'samlede', 'ligger', 'bliver', 'består',
  'though', 'which', 'their', 'there', 'company', 'between', 'because', 'however', 'mentions', 'largest', 'including', 'overall', 'consists'];
function _citeCheckWords(body, text, units) {
  const low = body.toLowerCase();
  const words = Array.from(new Set((text || '').replace(_CITE_REF_RE, ' ').toLowerCase().split(/[^a-zæøå]+/)
    .filter(w => w.length >= 6 && !_CITE_STOP.includes(w))));
  if (words.length < 2) return { state: 'missing', hits: [], found: [], missing: [], basis: 'none', units: [] };
  const enough = (k) => k >= 2 && k / words.length >= (k >= 3 ? 0.7 : 0.99);
  const stemOf = (w) => w.slice(0, Math.max(4, w.length - 3));
  const inText = (s) => words.filter(w => s.indexOf(stemOf(w)) >= 0);
  const onPage = inText(low);
  let best = null, bestFound = [];
  _citeWindows(units, 2).forEach(u => { const f = inText(low.slice(u.start, u.end)); if (f.length > bestFound.length) { best = u; bestFound = f; } });
  const hitsIn = (u, ws) => ws.map(w => { const at = low.slice(u.start, u.end).indexOf(stemOf(w)); return [u.start + at, u.start + at + stemOf(w).length]; });
  if (best && enough(bestFound.length)) {
    return { state: 'format', hits: hitsIn(best, bestFound), found: bestFound, missing: words.filter(w => !bestFound.includes(w)), basis: 'words', units: [best] };
  }
  if (enough(onPage.length)) {
    return { state: 'context', hits: [], found: onPage, missing: [], basis: 'words', units: best ? [best] : [] };
  }
  return { state: 'missing', hits: [], found: onPage, missing: words.filter(w => !onPage.includes(w)), basis: 'words', units: [] };
}

/**
 * Kontrollér en henvisning mod siden den peger på.
 * cite: { doc, page (ref), quote, context: { before, after, row } }
 * → { state, idx, hits: [[start, slut]], found, missing, label, basis, elsewhere, claim, passages }
 * state: 'exact' | 'format' (grønt) | 'context' (tallene står der, men ikke
 * sammen med påstandens nøgleord) | 'contra' (kilden siger det modsatte) | 'missing'
 */
function checkCite(cite) {
  // Memoets engelske tekst skriver tal på engelsk; den danske og kilderne på dansk
  const r = _checkCiteOne(Object.assign({ en: MEMO_EN }, cite));
  // På engelsk er kilderne stadig danske. Kan den engelske formulering ikke
  // bekræftes, prøves memoets danske formulering af samme henvisning.
  if (r.state !== 'exact' && r.state !== 'format' && cite.alt) {
    const a = _checkCiteOne(Object.assign({}, cite, cite.alt, { en: false }));
    const rank = { exact: 4, format: 4, contra: 3, context: 2, missing: 1 };
    if ((rank[a.state] || 0) > (rank[r.state] || 0)) { a.viaDa = true; return a; }
  }
  return r;
}

/** Den samme henvisning i memoets danske udgave: { quote, context } eller null */
function citeTwinDa(el) {
  if (!MEMO_EN || !el) return null;
  const da = el.getAttribute('data-claim-da');
  if (da) return { quote: (el.textContent || '').trim(), context: { before: da + ' ', after: '', row: true, label: true } };
  const sec = el.closest('.memo-sec');
  if (!sec) return null;
  const key = sec.id.replace('ms-', '');
  const html = SEC_DA[key];
  if (!html) return null;
  const i = Array.from(sec.querySelectorAll('.memo-body .memo-cite')).indexOf(el);
  if (i < 0) return null;
  // Er den engelske sætning rettet, siger den danske skabelon ikke længere
  // det samme. Så kontrolleres kun den engelske tekst.
  const en = document.createElement('div');
  en.innerHTML = SEC[key] || '';
  const seed = en.querySelectorAll('.memo-cite')[i];
  const norm = (c) => [c.before, c.after].join(' / ').replace(/\s+/g, ' ').trim();
  if (!seed || (seed.textContent || '').trim() !== (el.textContent || '').trim() || norm(citeContext(seed)) !== norm(citeContext(el))) return null;
  const d = document.createElement('div');
  d.innerHTML = html;
  const twin = d.querySelectorAll('.memo-cite')[i];
  if (!twin || twin.getAttribute('data-doc') !== el.getAttribute('data-doc') || twin.getAttribute('data-page') !== el.getAttribute('data-page')) return null;
  return { quote: (twin.textContent || '').trim(), context: citeContext(twin) };
}

function _checkCiteOne(cite) {
  const doc = cite.doc;
  const pages = (doc && doc.pages) || [];
  const idx0 = Math.max(0, pages.findIndex(p => p.ref === cite.page));
  const quote = (cite.quote || '').trim();
  // I indstillingsboksen er henvisningen altid en etiket ("Ansøgning, s. 1")
  const label = !!(cite.context && cite.context.label) || _citeIsLabel(quote, doc, cite.page);
  const ctx = cite.context || {};
  const claim = _citeClaim(quote, label, ctx);
  // Til visning: "B1Underskrevet" (fed id foran teksten) får sit mellemrum
  const claimText = claim.text.slice(claim.from, claim.to).replace(/\s+/g, ' ').replace(/^[\s|·,;:(]+|[\s|·,;:(]+$/g, '')
    .replace(/\b([A-Z]\d{1,2})([A-ZÆØÅ][a-zæøå])/g, '$1 $2').replace(/\s*\(\s*\)/g, '').replace(/\s+([.,;])/g, '$1');
  const claimTerms = _citePolarTerms(claim.text, claim.from, claim.to);
  const claimRange = claim.text.slice(claim.from, claim.to);

  const onPage = (i) => {
    const body = (pages[i] && pages[i].body) || '';
    const units = _citeUnits(body);
    const unitOf = (pos) => units.find(u => pos >= u.start && pos < u.end);
    // 1) Ordret, hvis henvisningen er en påstand og ikke en etiket. Står der
    //    "ikke" lige foran i kilden, er det ikke det samme.
    if (!label) {
      const hit = findQuote(body, quote);
      if (hit && _citeWords(quote.replace(_CITE_NUM_RE, ' ')).length) {
        const u = unitOf(hit[0]);
        const negated = _CITE_NEG_BEFORE.test(body.slice(Math.max(0, hit[0] - 12), hit[0]).toLowerCase().replace(/\s+$/, '')) && !/^(ikke|not|no|uden)\b/i.test(quote);
        const polar = {};
        const pol = negated ? 'contra' : _citePolarity(claimTerms, body, u ? [u] : [], units, polar);
        if (negated) { polar.term = quote; polar.src = body.slice(Math.max(0, hit[0] - 12), hit[1]).replace(/\s+/g, ' ').trim(); }
        if (pol !== 'contra') return { state: 'exact', hits: [hit], found: [quote], missing: [], basis: 'quote', units: u ? [u] : [] };
        return { state: 'contra', hits: [hit], found: [quote], missing: [], basis: 'quote', units: u ? [u] : [], polar };
      }
    }
    // 2) Påstanden har ingen tal: navne eller bærende ord i samme sætning
    const tk = _citeTokens(claim.text.slice(claim.from, claim.to), cite.en);
    if (claim.none || (!tk.nums.length && !tk.codes.length)) {
      const r = _citeCheckNames(body, label ? claim.text : quote, units);
      if (r.state === 'format' || r.state === 'context') {
        const polar = {};
        const pol = _citePolarity(claimTerms, body, r.units, units, polar);
        const cc = _citeCountContra(claimRange, body);
        if (cc) { r.state = 'contra'; r.polar = cc; }
        else if (pol === 'contra') { r.state = 'contra'; r.polar = polar; }
        else if (pol === 'unsupported' && r.state === 'format') { r.state = 'context'; r.polar = polar; }
        // En engelsk formulering kan ikke bekræftes af navne og ord i en dansk
        // kilde. Den danske tvilling (hvis teksten er urørt) kan.
        else if (cite.en && r.state === 'format') r.state = 'context';
      }
      return r;
    }
    // 3) Tallene: hvert tal skal stå i samme sætning eller række som sine nøgleord
    const nums = _citeClaimNums(claim, cite.en);
    const pageNums = _citeNumbers(body);
    const hits = [], found = [], missing = [], used = [];
    let looseN = [];
    nums.forEach(n => {
      const any = pageNums.filter(p => _citeNumEq(n, p));
      // Et tal efter henvisningen, som ikke står i kilden, kan have en anden kilde
      if (!any.length) { if (!n.secondary) missing.push(n.raw); return; }
      found.push(n.raw);
      if (_citeIsYear(n)) { any.slice(0, 3).forEach(p => hits.push([p.start, p.end])); return; }
      let a = null;
      for (const u of units) { a = _citeAnchored(n, nums, body, u, pageNums, { units, nums: pageNums }); if (a) { if (!used.includes(u)) used.push(u); break; } }
      if (a) { hits.push([a.p.start, a.p.end]); a.words.forEach(w => hits.push([w.start, w.end])); }
      else looseN.push(n);
    });
    /* Tal, der står sammen i samme sætning eller tabel, bekræfter hinanden
       ("30 mdr., 1. november 2026 til 30. april 2029"), når tallets egne
       nøgleord ikke står der. Står de der, men ud for et andet tal, er det
       netop den forkerte sammenhæng. Tal af samme slags skal stå i samme
       rækkefølge som i påstanden. */
    const kindOf = (x) => x.date ? 'date' : x.kind;
    const scopes = units.filter(u => !u.table).concat(Array.from(new Set(units.filter(u => u.table).map(u => u.block))));
    // På engelsk kan nøgleordene ikke findes i den danske kilde, så deres
    // fravær beviser intet; der klarer den danske tvilling bekræftelsen
    looseN = cite.en ? looseN : looseN.filter(n => {
      const others = nums.filter(m => m !== n && !m.secondary && !_citeIsYear(m) && !_citeNumEq(m, n) && !_citeNumEq(n, m));
      for (const S of scopes) {
        const inS = (x) => pageNums.filter(p => p.start >= S.start && p.end <= S.end && _citeNumEq(x, p));
        const unitOf = (p) => units.find(u => p.start >= u.start && p.end <= u.end) || S;
        const nPos = inS(n).filter(p => _citeTimeOk(n, body, unitOf(p), p, { units, nums: pageNums }));
        if (!nPos.length) continue;
        if (!n.weak && _citeToks(body, S).some(tk => n.anchors.some(a => _citeWordEq(a.w, tk.s)))) continue;
        const ok = others.some(m => {
          const mPos = inS(m);
          if (!mPos.length) return false;
          if (kindOf(m) !== kindOf(n)) return true;
          const mFirst = m.start < n.start;
          return mPos.some(a => nPos.some(b => mFirst ? a.start < b.start : a.start > b.start));
        });
        if (ok) {
          nPos.slice(0, 1).forEach(p => hits.push([p.start, p.end]));
          units.filter(u => u.start >= S.start && u.end <= S.end && nPos.some(p => p.start >= u.start && p.end <= u.end)).forEach(u => { if (!used.includes(u)) used.push(u); });
          return false;
        }
      }
      return true;
    });
    /* Dokumentets hovedbeløb: står påstandens ord i dokumentets titel
       ("LØSØREPANTEBREV"), og er tallet det første af sin slags på siden
       (hovedstolen), hører de sammen */
    const titleEnd = body.indexOf('\n') < 0 ? body.length : body.indexOf('\n');
    const titleToks = _citeToks(body, { start: 0, end: titleEnd });
    const claimWords = _citeWords(claimRange);
    looseN = looseN.filter(n => {
      if (n.secondary || cite.en) return true;
      if (!titleToks.some(tk => claimWords.some(a => _citeWordEq(a.w, tk.s)))) return true;
      const kind = (x) => x.date ? 'date' : x.kind === 'amt' ? 'n' : x.kind;
      // (for en dato: dokumentets første dato, fx tillæggets dato)
      const first = pageNums.filter(q => q.start > titleEnd && (n.date ? !!q.date : !q.date && q.kind === n.kind && (q.kind !== 'n' || Math.abs(q.v) >= 1000)))
        .sort((a, b) => a.start - b.start)[0];
      const fu = first && units.find(x => first.start >= x.start && first.end <= x.end);
      if (first && _citeNumEq(n, first) && fu && _citeTimeOk(n, body, fu, first, { units, nums: pageNums })) { hits.push([first.start, first.end]); const u = units.find(x => first.start >= x.start && first.end <= x.end); if (u && !used.includes(u)) used.push(u); return false; }
      return true;
    });
    /* Et tal efter henvisningen uden egen kilde er kun et problem, når et navn
       ved tallet ("Vestas alene på 38 %") i kilden står ud for et andet tal */
    looseN = looseN.filter(n => {
      if (!n.secondary) return true;
      // Kun et navn lige foran tallet ("Vestas alene på 38 %") er tallets ejer
      const names = n.anchors.filter(a => a.name && a.end <= n.start && n.start - a.end <= 25);
      if (!names.length) return false;
      const kind = (x) => x.date ? 'date' : x.kind === 'amt' ? 'n' : x.kind;
      return units.some(u => _citeToks(body, u).some(tk => names.some(a => _citeWordEq(a.w, tk.s))) &&
        pageNums.some(q => q.start >= u.start && q.end <= u.end && kind(q) === kind(n) && !_citeIsYear(q) && !_citeNumEq(n, q)));
    });
    const loose = looseN.map(n => n.raw);
    looseN.forEach(n => pageNums.filter(p => _citeNumEq(n, p)).slice(0, 6).forEach(p => hits.push([p.start, p.end])));
    tk.codes.forEach(c => {
      const at = body.indexOf(c);
      if (at >= 0) { found.push(c); hits.push([at, at + c.length]); } else missing.push(c);
    });
    const basis = label ? (ctx.row ? 'row' : 'sentence') : 'quote';
    if (missing.length) {
      // Hvad står der i kilden ud for påstandens nøgleord (samme række, samme år)?
      const suggest = [];
      nums.filter(n => !n.secondary && missing.includes(n.raw) && !n.date && !_citeIsYear(n)).forEach(n => {
        const kind = (x) => x.kind === 'amt' ? 'n' : x.kind;
        for (const u of units) {
          const toks = _citeToks(body, u);
          const hitsU = toks.filter(tk => n.anchors.some(a => _citeWordEq(a.w, tk.s)));
          if (!hitsU.length) continue;
          const qs = pageNums.filter(q => q.start >= u.start && q.end <= u.end && !q.date && !_citeIsYear(q) && kind(q) === kind(n));
          if (!qs.length) continue;
          let q = null;
          if (u.table && n.years && n.years.length) q = qs.find(x => n.years.some(y => y.v === _citeColYear(body, u, x)));
          if (!q) q = qs.slice().sort((a, b) => Math.min(...hitsU.map(h => Math.abs(a.start - h.end))) - Math.min(...hitsU.map(h => Math.abs(b.start - h.end))))[0];
          if (q) { suggest.push({ claim: n.raw, src: body.slice(q.start, q.end).trim() }); hits.push([q.start, q.end]); if (!used.includes(u)) used.push(u); break; }
        }
      });
      return { state: 'missing', hits: suggest.length ? hits : [], found, missing, basis, units: suggest.length ? used.slice(0, 2) : [], suggest };
    }
    const looseUnits = loose.length ? units.filter(u => pageNums.some(p => p.start >= u.start && p.end <= u.end && nums.some(n => loose.includes(n.raw) && _citeNumEq(n, p)))).slice(0, 3) : [];
    const polar = {};
    const pol = _citePolarity(claimTerms, body, used, units, polar);
    const cc = _citeCountContra(claimRange, body);
    if (cc) return { state: 'contra', hits, found, missing: [], loose, basis, units: used.length ? used : looseUnits, polar: cc };
    if (pol === 'contra') return { state: 'contra', hits, found, missing: [], loose, basis, units: used.length ? used : looseUnits, polar };
    if (loose.length || pol === 'unsupported' || (!used.length && nums.some(n => !_citeIsYear(n)))) {
      // Vis først, hvor de løse tal står
      return { state: 'context', hits, found, missing: [], loose, basis, units: looseUnits.concat(used.filter(u => !looseUnits.includes(u))).slice(0, 3), polar: pol === 'unsupported' ? polar : null };
    }
    return { state: 'format', hits, found, missing: [], basis, units: used };
  };

  const res = onPage(idx0);
  res.idx = idx0;
  res.label = label;
  res.claim = claimText;
  const body0 = (pages[idx0] && pages[idx0].body) || '';
  res.passages = (res.units || []).map(u => body0.slice(u.start, u.end).replace(/\s+/g, ' ').trim()).filter(Boolean);
  // Står det på en anden side i samme dokument, så sig hvor
  res.elsewhere = -1;
  if (res.state === 'missing' && res.basis !== 'none') {
    for (let i = 0; i < pages.length; i++) {
      if (i === idx0) continue;
      const o = onPage(i).state;
      if (o === 'exact' || o === 'format') { res.elsewhere = i; break; }
    }
  }
  return res;
}

/* Dokumentregistret (DATA.DOCS) er det, der står under Dokumenter. En
   henvisning til en fil, der ikke står der, kan komitéen ikke slå op. */
function memoDocInCase(name) {
  const docs = (window.DATA && Array.isArray(DATA.DOCS)) ? DATA.DOCS : null;
  if (!docs) return true;
  return docs.some(d => d && (d.name === name || d.fileName === name));
}

/* Henvisningens tilgængelige navn begynder med den synlige tekst (WCAG 2.5.3),
   og kilden følger efter: "DKK 41,1 mio., kilde: Aarsrapport 2025, s. 9". */
function memoCiteName(visible, doc, page, noDoc) {
  const file = String(doc || '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
  return String(visible || '').replace(/\s+/g, ' ').trim() + ', ' + t('kilde') + ': ' + file + (page ? ', ' + memoRefLabel(page) : '') +
    (noDoc ? '. ' + t('Dokumentet findes ikke i sagen') : '');
}

/** Gør én henvisning til en knap for tastatur og skærmlæser, og markerer den, hvis dokumentet mangler i sagen. */
/* ── Bilagslisten (Bilag 3) og sagens dokumenter ────────────────────────────
   Sagens dokumenter: registret under Dokumenter (uden erstattede versioner)
   og de filer, rådgiveren har godkendt fra kunden. → [{ name, type, date }] */
function memoCaseDocList() {
  const out = [];
  const seen = new Set();
  ((window.DATA && Array.isArray(DATA.DOCS)) ? DATA.DOCS : []).forEach(d => {
    // Crediwires egne eksporter er afledt af kildedokumenterne og er ikke bilag
    if (!d || !d.name || d.superseded || d.origin === 'export' || seen.has(d.name)) return;
    seen.add(d.name);
    out.push({ name: d.name, type: t(d.type || 'Andet'), date: d.date || '' });
  });
  const ups = window.CW && CW.allUploads ? CW.allUploads() : [];
  ups.forEach(f => {
    const name = f && (f.name || f.fileName);
    if (!name || f.itemStatus !== 'approved' || seen.has(name)) return;
    seen.add(name);
    out.push({ name, type: f.itemLabel || t('Kundeupload'), date: (f.at || f.uploadedAt || '').slice(0, 10) });
  });
  return out;
}
function _memoAppxDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return '';
  return window.DATA && DATA.fmt && DATA.fmt.longDate ? DATA.fmt.longDate(iso.slice(0, 10)) : iso.slice(0, 10);
}
/* Bilagslistens tabel i et afsnits HTML: tabellen efter overskriften "Bilagsliste" */
function _memoAppxTable(root) {
  const h = [...root.querySelectorAll('h3, h4')].find(x => /Bilagsliste|Appendix list/i.test(x.textContent || ''));
  let n = h ? h.nextElementSibling : null;
  while (n && n.tagName !== 'TABLE') n = n.nextElementSibling;
  return n;
}
/** Dokumenter i sagen, som bilagslisten i en HTML ikke nævner */
function memoAppendixMissing(root) {
  const table = root && _memoAppxTable(root);
  if (!table) return [];
  const txt = table.textContent || '';
  return memoCaseDocList().filter(d => txt.indexOf(d.name) < 0);
}
/** Føjer de manglende dokumenter til bilagslistens tabel (i memoet eller i Word) */
function memoAppendixAdd(root) {
  const table = root && _memoAppxTable(root);
  const tb = table && (table.querySelector('tbody') || table);
  if (!tb) return 0;
  const miss = memoAppendixMissing(root);
  let n = tb.querySelectorAll('tr').length;
  miss.forEach(d => {
    const tr = document.createElement('tr');
    [String(++n), d.name, d.type, _memoAppxDate(d.date)].forEach((v, i) => {
      const td = document.createElement('td');
      if (i === 0) td.style.fontFamily = 'monospace';
      if (i === 0 || i === 3) td.style.color = 'var(--c-text-2)';
      td.textContent = v;
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  return miss.length;
}

/* Nyt materiale fra kunden siden memoets udkast (CASE_FACTS.asOf): godkendte
   punkter og punkter, kunden har svaret på uden fil ("Har vi ikke"). Hvilke
   afsnit der skal læses igen, er et fast opslag på punktets navn. */
const _MEMO_NEW_MAP = [
  [/lån|kredit|gæld|leasing|loan/i, ['financing', 'appendix1']],
  [/land|eksport|salg|marked|country|sales/i, ['market']],
  [/valuta|currency|hedg/i, ['risk', 'appendix1']],
  [/årsrapport|periode|budget|regnskab|likvid|annual|interim/i, ['financial']],
  [/ejer|vedtægt|selskab|pep|owner/i, ['ownership']],
  [/kunde|ordre|kontrakt|customer|order/i, ['market', 'risk']],
  [/sikkerhed|pant|kaution|security|guarantee/i, ['appendix1']],
];
function memoNewMaterial() {
  if (!window.CW || !CW.requestedItems) return [];
  const asOf = (window.CASE_FACTS && CASE_FACTS.asOf) || '';
  const out = [];
  CW.requestedItems().forEach(it => {
    const st = CW.itemState(it.id);
    if (!st || (st.status !== 'approved' && st.status !== 'noted')) return;
    const at = String(st.reviewedAt || st.at || '');
    if (asOf && at && at.slice(0, 10) <= asOf) return;
    const label = t(it.label || it.id);
    const secs = [];
    _MEMO_NEW_MAP.forEach(([re, ks]) => { if (re.test((it.label || '') + ' ' + (it.category || ''))) ks.forEach(k => { if (!secs.includes(k)) secs.push(k); }); });
    out.push({ id: it.id, label, noted: st.status === 'noted', note: st.note || '', sections: secs });
  });
  return out;
}
function MemoNewMaterialBanner({ version }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const on = () => setTick(x => x + 1);
    window.addEventListener('cw-case-changed', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('cw-case-changed', on); window.removeEventListener('storage', on); };
  }, []);
  const items = React.useMemo(() => memoNewMaterial(), [version, tick]);
  if (!items.length) return null;
  const secs = [];
  items.forEach(x => x.sections.forEach(k => { if (!secs.includes(k)) secs.push(k); }));
  const nums = MEMO_SECTIONS.filter(s => secs.includes(s.k)).map(s => s.num);
  const numsTxt = nums.length > 1 ? nums.slice(0, -1).join(', ') + ' ' + t('og') + ' ' + nums[nums.length - 1] : nums.join('');
  const asOf = window.CASE_FACTS && CASE_FACTS.asOf;
  const route = String(localStorage.getItem('cw_route') || 'workspace:1');
  const caseId = route.split(':')[1] || '1';
  return (
    <div className="memo-new-note" role="note" style={{ margin: '0 0 16px', padding: '10px 12px', border: '1px solid var(--c-line)', borderRadius: 8, background: 'var(--c-warn-bg)', fontSize: 12.5, color: 'var(--c-ink)', lineHeight: 1.5, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ flex: 1, minWidth: 240 }}>
        <b style={{ fontWeight: 600 }}>{t('Nyt materiale siden udkastet') + (asOf && window.DATA && DATA.fmt ? ' (' + DATA.fmt.longDate(asOf) + ')' : '')}:</b>{' '}
        {items.map(x => x.label + (x.noted ? ' (' + t('kundens svar') + (x.note ? ': "' + x.note + '"' : '') + ')' : '')).join(', ')}.
        {nums.length ? ' ' + t('Læs afsnit') + ' ' + numsTxt + ' ' + t('igen.') : ''}
      </span>
      <button type="button" className="btn btn-sm" onClick={() => { if (window.__go) window.__go('workspace:' + caseId + ':documents'); }}>{t('Se i Dokumenter')}</button>
    </div>
  );
}

/* Under Bilag 3: dokumenter i sagen, som bilagslisten ikke nævner, med en
   knap der føjer dem til listen (det er en rettelse af afsnittet) */
function MemoAppendixNote({ readOnly, version }) {
  const [tick, setTick] = React.useState(0);
  const [miss, setMiss] = React.useState([]);
  React.useEffect(() => {
    const id = setTimeout(() => {
      const live = document.querySelector('#ms-appendix3 [contenteditable]') || document.querySelector('#ms-appendix3 .memo-body');
      let root = live;
      if (!root) { root = document.createElement('div'); root.innerHTML = sectionHtml('appendix3'); }
      setMiss(memoAppendixMissing(root));
    }, 60);
    return () => clearTimeout(id);
  }, [version, tick]);
  if (!miss.length) return null;
  const add = () => {
    const ed = document.querySelector('#ms-appendix3 [contenteditable]');
    if (!ed) return;
    memoAppendixAdd(ed);
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    setTick(x => x + 1);
    CW.toast(t('Bilagslisten er opdateret. Gennemgå Bilag 3 igen.'), { tone: 'ok' });
  };
  return (
    <div className="memo-appx-note" role="note" style={{ margin: '10px 0 0', padding: '10px 12px', border: '1px solid var(--c-line)', borderRadius: 8, background: 'var(--c-warn-bg)', fontSize: 12.5, color: 'var(--c-ink)', lineHeight: 1.5, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ flex: 1, minWidth: 240 }}>
        <b style={{ fontWeight: 600 }}>{miss.length + ' ' + (miss.length === 1 ? t('dokument i sagen står ikke i bilagslisten') : t('dokumenter i sagen står ikke i bilagslisten'))}:</b>{' '}
        {miss.map(d => d.name).join(', ')}
      </span>
      {!readOnly && <button type="button" className="btn btn-sm" onClick={add}>{t('Tilføj til bilagslisten')}</button>}
    </div>
  );
}

/* Kildeviserens udfald for en henvisning i memoet: 'missing' | 'contra' | andet.
   Huskes pr. henvisning og tekst, så en hel gennemgang af memoet er billig. */
const _citeStateCache = new Map();
function memoCiteCheckState(el) {
  const doc = (window.CASE_DOCS || []).find(d => d.name === el.getAttribute('data-doc'));
  if (!doc) return null;
  const ctx = citeContext(el);
  const key = (MEMO_EN ? 'en|' : 'da|') + doc.name + '|' + el.getAttribute('data-page') + '|' + el.textContent + '|' + ctx.before + '|' + ctx.after;
  if (_citeStateCache.has(key)) return _citeStateCache.get(key);
  let st = null;
  try { st = checkCite({ doc, page: el.getAttribute('data-page'), quote: (el.textContent || '').trim(), context: ctx, alt: citeTwinDa(el) }).state; } catch (e) { st = null; }
  if (_citeStateCache.size > 2000) _citeStateCache.clear();
  _citeStateCache.set(key, st);
  return st;
}

function decorateCite(el) {
  if (window.CW_SOURCE_VIEW !== true) {
    ['role', 'tabindex', 'aria-label', 'data-nodoc', 'data-check'].forEach(a => el.removeAttribute(a));
    return;
  }
  const doc = el.getAttribute('data-doc') || '';
  const page = el.getAttribute('data-page') || '';
  const inCase = memoDocInCase(doc);
  // Ikke fundet eller modsagt i kilden: en diskret markering (attribut og CSS,
  // ingen ny tekst), så et rettet tal ikke ser normalt ud. Grønt og "kontrollér
  // sammenhængen" markeres ikke.
  const st = memoCiteCheckState(el);
  const bad = st === 'missing' || st === 'contra' ? st : null;
  const label = memoCiteName(el.textContent, doc, page, !inCase) + (bad ? '. ' + (bad === 'contra' ? t('Kilden siger det modsatte') : t('Ikke bekræftet i kilden')) : '');
  if (el.getAttribute('role') !== 'button') el.setAttribute('role', 'button');
  if (el.getAttribute('tabindex') !== '0') el.setAttribute('tabindex', '0');
  if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
  if (inCase) el.removeAttribute('data-nodoc'); else el.setAttribute('data-nodoc', '1');
  if (bad) { if (el.getAttribute('data-check') !== bad) el.setAttribute('data-check', bad); } else el.removeAttribute('data-check');
}
function decorateCites(root) {
  if (!root) return;
  root.querySelectorAll('.memo-cite').forEach(decorateCite);
}

/* Til de automatiske browsertests: kontrollér én henvisning i memoet */
window.__memoCheckCite = function (el) {
  const doc = (window.CASE_DOCS || []).find(d => d.name === el.getAttribute('data-doc'));
  if (!doc) return { state: 'nodoc' };
  return checkCite({ doc, page: el.getAttribute('data-page'), quote: (el.textContent || '').trim(), context: citeContext(el), alt: citeTwinDa(el) });
};

/* Til klarhedstjekket: de henvisninger i memoets afsnit, som kildeviseren ikke
   kan bekræfte. Læser afsnittenes gemte tekst, så memoet ikke skal være vist.
   CW_CITE_ISSUES({ sections: ['risk', ...] }) begrænser til bestemte afsnit.
   → { checked, green, unverified: [item], contra: [item] }
   item = { section, text, claim, doc, page, state }
   state: 'context' (kontrollér sammenhængen) | 'missing' (ikke fundet) |
   'nodoc' (dokumentet findes ikke) i unverified; 'contra' (kilden siger det modsatte) i contra.
   Resultatet huskes pr. afsnitstekst, så gentagne kald er billige. */
const _citeIssueCache = new Map();
window.CW_CITE_ISSUES = function (opts) {
  const keys = opts && Array.isArray(opts.sections) && opts.sections.length ? opts.sections : MEMO_SECTIONS.map(s => s.k);
  const out = { checked: 0, green: 0, unverified: [], contra: [] };
  keys.forEach(k => {
    const html = sectionHtml(k);
    const ck = (MEMO_EN ? 'en:' : 'da:') + k + ':' + html;
    let rows = _citeIssueCache.get(ck);
    if (!rows) {
      rows = [];
      const sec = document.createElement('div');
      sec.className = 'memo-sec';
      sec.id = 'ms-' + k;
      const body = document.createElement('div');
      body.className = 'memo-body';
      body.innerHTML = html;
      sec.appendChild(body);
      body.querySelectorAll('.memo-cite').forEach(el => {
        const name = el.getAttribute('data-doc') || '';
        const page = el.getAttribute('data-page') || '';
        const text = (el.textContent || '').trim();
        const doc = (window.CASE_DOCS || []).find(d => d.name === name);
        if (!doc || !memoDocInCase(name)) { rows.push({ section: k, text, claim: text, doc: name, page, state: 'nodoc' }); return; }
        const r = checkCite({ doc, page, quote: text, context: citeContext(el), alt: citeTwinDa(el) });
        rows.push({ section: k, text, claim: r.claim || text, doc: name, page, state: r.state });
      });
      if (_citeIssueCache.size > 200) _citeIssueCache.clear();
      _citeIssueCache.set(ck, rows);
    }
    rows.forEach(x => {
      out.checked++;
      if (x.state === 'exact' || x.state === 'format') out.green++;
      else if (x.state === 'contra') out.contra.push(Object.assign({}, x));
      else out.unverified.push(Object.assign({}, x));
    });
  });
  return out;
};

function SourceViewer({ doc, page, quote, context, alt, inCase, onClose }) {
  const pages = doc.pages || [];
  const startIdx = Math.max(0, pages.findIndex(p => p.ref === page));
  const [idx, setIdx] = React.useState(startIdx);
  const cur = pages[idx];
  const boxRef = React.useRef(null);
  const markRef = React.useRef(null);
  CW.useDialog(boxRef, true, onClose);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && /TEXTAREA|INPUT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' && idx < pages.length - 1) setIdx(idx + 1);
      if (e.key === 'ArrowLeft' && idx > 0) setIdx(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, pages.length]);

  // Kontrollen køres på den side, der vises. Første gang er det den side,
  // henvisningen peger på.
  const first = React.useMemo(() => quote ? checkCite({ doc, page, quote, context, alt }) : null, [doc, page, quote]);
  const res = React.useMemo(() => {
    if (!quote || !cur) return null;
    return idx === startIdx ? first : checkCite({ doc, page: cur.ref, quote, context, alt });
  }, [idx, first]);

  const body = React.useMemo(() => {
    const text = cur ? cur.body : '';
    if (!res || !res.hits.length) return [{ t: text, hit: false }];
    // Et fundet ord fremhæves helt, også når kun stammen blev sammenlignet
    const isL = (c) => !!c && /[A-Za-zÆØÅæøåÄÖÜäöü]/.test(c);
    const whole = (h) => {
      let a = h[0], z = h[1];
      if (!isL(text[a]) || !isL(text[z - 1])) return h;
      while (a > 0 && isL(text[a - 1])) a--;
      while (z < text.length && isL(text[z])) z++;
      return [a, z];
    };
    // Flere fund: sortér og slå overlappende sammen
    const hs = res.hits.map(whole).sort((a, b) => a[0] - b[0]).reduce((acc, h) => {
      const last = acc[acc.length - 1];
      if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]); else acc.push([h[0], h[1]]);
      return acc;
    }, []);
    const out = [];
    let pos = 0;
    hs.forEach(h => { if (h[0] > pos) out.push({ t: text.slice(pos, h[0]), hit: false }); out.push({ t: text.slice(h[0], h[1]), hit: true }); pos = h[1]; });
    if (pos < text.length) out.push({ t: text.slice(pos), hit: false });
    return out;
  }, [cur, res]);

  // Første fund rulles ind i syne
  React.useEffect(() => {
    const id = setTimeout(() => { if (markRef.current) markRef.current.scrollIntoView({ block: 'center' }); }, 30);
    return () => clearTimeout(id);
  }, [idx, res]);

  const state = res ? res.state : null;
  const green = state === 'exact' || state === 'format';
  const contra = state === 'contra';
  const list = (xs) => xs.slice(0, 6).join(', ') + (xs.length > 6 ? ' ' + t('og') + ' ' + (xs.length - 6) + ' ' + t('mere') : '');
  let msg = '';
  const curRef = cur ? memoRefLabel(cur.ref) : '';
  if (state === 'exact') msg = t('Fundet ordret på') + ' ' + curRef + '. ' + t('Fremhævet nedenfor.');
  else if (state === 'format') {
    msg = t('Bekræftet på') + ' ' + curRef + ': ';
    if (res.basis === 'names') msg += t('navnene står samlet i kilden. Selve formuleringen er memoets egen.');
    else if (res.basis === 'words') msg += t('sætningens bærende ord står samlet i kilden. De er fremhævet.');
    else msg += list(res.found) + ' ' + t('står i samme sætning eller tabelrække som påstandens nøgleord. Fremhævet nedenfor.');
    if (res.viaDa) msg += ' ' + t('Kontrolleret mod memoets danske formulering, da kilden er på dansk.');
  } else if (state === 'context') {
    // Tallene eller ordene står der, men ikke i påstandens sammenhæng
    msg = t('Kontrollér sammenhængen.') + ' ';
    if (res.polar && res.polar.term) msg += t('Tallene står på') + ' ' + curRef + ', ' + t('men kilden bekræfter ikke') + ' "' + res.polar.term + '".';
    else if (res.loose && res.loose.length) msg += list(res.loose) + ' ' + t('står på') + ' ' + curRef + ', ' + t('men ikke i samme sætning eller række som påstandens nøgleord.');
    else if (res.basis === 'names') msg += t('Navnene står på') + ' ' + curRef + ', ' + t('men ikke samlet.');
    else msg += t('De bærende ord står på') + ' ' + curRef + ', ' + t('men ikke i samme sætning.');
    if (res.viaDa) msg += ' ' + t('Kontrolleret mod memoets danske formulering, da kilden er på dansk.');
  } else if (contra) {
    msg = t('Kilden siger det modsatte på') + ' ' + curRef + (res.polar && res.polar.src ? ': "' + res.polar.src + '"' : '') + '. ' +
      (res.polar && res.polar.term ? t('Memoet skriver') + ' "' + res.polar.term + '". ' : '') + t('Ret påstanden eller henvisningen.');
  } else if (state === 'missing') {
    msg = res.basis === 'words'
      ? t('Ikke fundet på') + ' ' + curRef + '. ' + t('Kun') + ' ' + res.found.length + ' ' + t('af') + ' ' + (res.found.length + res.missing.length) + ' ' + t('bærende ord i sætningen står på siden. Gennemgå selv.')
      : res.missing.length
      ? t('Ikke fundet på') + ' ' + curRef + ': ' + list(res.missing) + '. ' + t('Gennemgå selv.')
      : t('Påstanden har ingen tal eller navne, der kan slås op automatisk. Gennemgå selv.');
    // Hvad kilden har ud for påstandens nøgleord: "Kilden har 41.100 på s. 6"
    if (res.suggest && res.suggest.length) msg += ' ' + res.suggest.slice(0, 3).map(x => t('Kilden har') + ' ' + x.src + ' ' + t('på') + ' ' + curRef + ' (' + t('memoet skriver') + ' ' + x.claim + ')').join('; ') + '.';
  }

  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', zIndex: 9000, display: 'grid', placeItems: 'center', padding: 24 }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={doc.name}
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
              <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2 }}>{t(doc.type)}{doc.meta ? ' · ' + t(doc.meta.split('·')[0].trim()) : ''}</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>{t('Luk')}</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {pages.map((p, i) => (
              <button
                key={p.ref}
                onClick={() => setIdx(i)}
                aria-pressed={i === idx}
                style={{
                  height: 24, padding: '0 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 11.5, fontWeight: 500,
                  border: '1px solid ' + (i === idx ? 'var(--c-ink)' : 'var(--c-line)'),
                  background: i === idx ? 'var(--c-ink)' : '#fff',
                  color: i === idx ? '#fff' : 'var(--c-text-2)',
                }}
              >{memoRefLabel(p.ref)}</button>
            ))}
          </div>
        </div>

        {inCase === false && (
          <div role="note" style={{ padding: '9px 20px', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.25)', fontSize: 11.5, color: '#b91c1c', lineHeight: 1.5 }}>
            <b style={{ fontWeight: 600 }}>{t('Dokumentet findes ikke i sagen.')}</b>{' '}
            {t('Det står ikke under Dokumenter, så komitéen kan ikke slå henvisningen op. Upload filen til sagen eller ret henvisningen.')}
          </div>
        )}
        {quote && res && (
          <div style={{
            padding: '9px 20px', background: green ? 'rgba(16,138,80,0.06)' : contra ? 'rgba(239,68,68,0.06)' : 'var(--c-warn-bg)',
            borderBottom: '1px solid ' + (green ? 'rgba(16,138,80,0.2)' : contra ? 'rgba(239,68,68,0.25)' : '#f4dfb7'),
            fontSize: 11.5, color: green ? 'var(--c-success)' : contra ? '#b91c1c' : 'var(--c-warn)', lineHeight: 1.5,
          }}>
            {/* Hvad der blev sammenlignet: påstanden i memoet og passagen i kilden */}
            <div className="memo-src-claim" style={{ color: 'var(--c-text-2)', marginBottom: 2 }}>
              {res.label && res.claim && res.claim !== quote
                ? t('Henvisningen') + ' "' + quote + '" ' + t('dækker påstanden:') + ' "' + res.claim + '"'
                : t('Påstand i memoet:') + ' "' + (res.claim || quote) + '"'}
            </div>
            {res.passages && res.passages.length > 0 && (
              <div className="memo-src-passage" style={{ color: 'var(--c-text-2)', marginBottom: 2 }}>
                {t('Sammenlignet med kilden:') + ' "' + res.passages.slice(0, 2).map(p => p.length > 220 ? p.slice(0, 217).replace(/\s+\S*$/, '') + ' …' : p).join('" · "') + '"'}
              </div>
            )}
            <span className="memo-src-status" data-state={state} data-found={green ? '1' : '0'} role="status">
              <b aria-hidden="true" style={{ marginRight: 5 }}>{green ? '✓' : state === 'context' ? '?' : '!'}</b>{msg}
            </span>
            {state === 'missing' && first && first.elsewhere >= 0 && first.elsewhere !== idx && (
              <button type="button" onClick={() => setIdx(first.elsewhere)}
                style={{ marginLeft: 8, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: 'var(--c-primary)', textDecoration: 'underline' }}>
                {t('Står på') + ' ' + memoRefLabel(pages[first.elsewhere].ref)}
              </button>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)', marginBottom: 8 }}>
            {cur ? memoRefLabel(cur.ref) + ' · ' + cur.title : ''}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.7, color: 'var(--c-ink)' }}>
            {(() => { let firstHit = true; return body.map((b, i) => {
              if (!b.hit) return <span key={i}>{b.t}</span>;
              const r = firstHit ? markRef : undefined; firstHit = false;
              return <mark key={i} ref={r} style={{ background: state === 'exact' ? '#fde68a' : green ? 'rgba(16,185,129,0.22)' : contra ? 'rgba(239,68,68,0.16)' : 'var(--c-warn-bg)', padding: '1px 2px', borderRadius: 3 }}>{b.t}</mark>;
            }); })()}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sammenligning af to indstillede versioner ───────────────────────────────
   Afsnit for afsnit: tilføjet tekst understreget med grønt, fjernet tekst
   overstreget med rødt. Ændrede tal står øverst ved afsnittet, så man ikke
   skal lede efter dem. Forsiden sammenlignes række for række.
   ──────────────────────────────────────────────────────────────────────────── */
function _memoPlainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove());
  d.querySelectorAll('p, li, h3, h4, td, th, blockquote, div, br').forEach(el => el.after(document.createTextNode(' ')));
  return d.textContent.replace(/\s+/g, ' ').trim();
}
/** Ord-diff: [{ t: '=' | '-' | '+', w: [ord] }] */
function _memoDiffWords(a, b) {
  const A = a ? a.split(' ') : [], B = b ? b.split(' ') : [];
  let pre = 0;
  while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
  let suf = 0;
  while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
  const a2 = A.slice(pre, A.length - suf), b2 = B.slice(pre, B.length - suf);
  const ops = [];
  const push = (tp, w) => {
    if (!w.length) return;
    const last = ops[ops.length - 1];
    if (last && last.t === tp) last.w = last.w.concat(w); else ops.push({ t: tp, w: w.slice() });
  };
  push('=', A.slice(0, pre));
  const n = a2.length, m = b2.length;
  if (n * m > 4000000) { push('-', a2); push('+', b2); }
  else {
    const L = [];
    for (let i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a2[i] === b2[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a2[i] === b2[j]) { push('=', [a2[i]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { push('-', [a2[i]]); i++; }
      else { push('+', [b2[j]]); j++; }
    }
    push('-', a2.slice(i));
    push('+', b2.slice(j));
  }
  push('=', A.slice(A.length - suf));
  return ops;
}
/* Ændringer, der indeholder tal: [{ from, to }] */
function _memoNumChanges(ops) {
  const out = [];
  let del = [], ins = [];
  const flush = () => {
    const f = del.join(' '), to = ins.join(' ');
    if (/\d/.test(f + to)) out.push({ from: f, to });
    del = []; ins = [];
  };
  ops.forEach(o => {
    if (o.t === '=') { if (del.length || ins.length) flush(); }
    else if (o.t === '-') del = del.concat(o.w);
    else ins = ins.concat(o.w);
  });
  if (del.length || ins.length) flush();
  return out;
}
function _memoFactText(r) {
  if (!r) return '';
  if (r.items) return [r.summary].concat((r.items || []).map(it => [it.id, it.text, it.tag].filter(Boolean).join(' '))).filter(Boolean).join('; ');
  return r.value || '';
}
function MemoDiffOps({ ops }) {
  const CTX = 10;
  return (
    <>
      {ops.map((o, i) => {
        // Fjernet og tilføjet tekst lige efter hinanden skilles af et mellemrum
        if (o.t === '-') return <React.Fragment key={i}><del><span className="memo-sr">{t('Fjernet')}: </span>{o.w.join(' ')}</del>{ops[i + 1] && ops[i + 1].t === '+' ? ' ' : ''}</React.Fragment>;
        if (o.t === '+') return <ins key={i}><span className="memo-sr">{t('Tilføjet')}: </span>{o.w.join(' ')}</ins>;
        const w = o.w;
        const first = i === 0, last = i === ops.length - 1;
        let txt;
        if (w.length <= CTX * 2 + 4) txt = w.join(' ');
        else if (first) txt = '… ' + w.slice(-CTX).join(' ');
        else if (last) txt = w.slice(0, CTX).join(' ') + ' …';
        else txt = w.slice(0, CTX).join(' ') + ' … ' + w.slice(-CTX).join(' ');
        return <span key={i}>{(first ? '' : ' ') + txt + (last ? '' : ' ')}</span>;
      })}
    </>
  );
}
function MemoCompareView({ cur, prev }) {
  const data = React.useMemo(() => {
    const cs = cur.sections || {}, ps = prev.sections || {};
    const secs = MEMO_SECTIONS.map(s => {
      const a = _memoPlainText(ps[s.k]), b = _memoPlainText(cs[s.k]);
      if (a === b) return { s, same: true };
      const ops = _memoDiffWords(a, b);
      return { s, same: false, ops, nums: _memoNumChanges(ops) };
    });
    const fa = ps.__front ? ps.__front.facts : null, fb = cs.__front ? cs.__front.facts : null;
    const facts = [];
    if (fa && fb) fb.forEach(r => {
      const x = _memoFactText(fa.find(o => o.k === r.k)), y = _memoFactText(r);
      if (x !== y) facts.push({ label: r.label, from: x, to: y });
    });
    return { secs, facts };
  }, [cur.version, prev.version]);
  const changed = data.secs.filter(x => !x.same);
  const same = data.secs.filter(x => x.same);
  const h2 = { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em' };
  return (
    <div className="memo-diff">
      <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6, marginBottom: 24, paddingBottom: 14, borderBottom: '1px solid var(--c-line-2)' }}>
        <b style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{_memoFill(t('{n} af {total} afsnit er ændret fra version {a} til version {b}.'), { n: changed.length, total: MEMO_SECTIONS.length, a: prev.version, b: cur.version })}</b>{' '}
        {t('Tilføjet tekst er understreget med grønt, fjernet tekst er overstreget med rødt.')}
      </div>
      {data.facts.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ ...h2, marginBottom: 8 }}>{t('Indstillingen i hovedtræk')}</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            {data.facts.map((f, i) => (
              <li key={i}><b style={{ fontWeight: 600 }}>{f.label}:</b> {f.from ? <del><span className="memo-sr">{t('Fjernet')}: </span>{f.from}</del> : null} <ins><span className="memo-sr">{t('Tilføjet')}: </span>{f.to || t('tom')}</ins></li>
            ))}
          </ul>
        </section>
      )}
      {changed.map(({ s, ops, nums }) => (
        <section key={s.k} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--c-text-4)', width: 20, flexShrink: 0 }}>{s.num}</span>
            <h2 style={h2}>{t(s.label)}</h2>
          </div>
          {nums.length > 0 && (
            <div style={{ paddingLeft: 29, fontSize: 12.5, color: 'var(--c-text-2)', marginBottom: 6, lineHeight: 1.6 }}>
              <span className="label-mini" style={{ marginRight: 6 }}>{t('Tal ændret')}</span>
              {nums.map((x, i) => (
                <span key={i} style={{ marginRight: 12, whiteSpace: 'nowrap' }}>
                  {x.from ? <del>{x.from}</del> : null}{x.from && x.to ? ' → ' : ''}{x.to ? <ins>{x.to}</ins> : null}
                </span>
              ))}
            </div>
          )}
          <p style={{ margin: 0, paddingLeft: 29, fontSize: 13, lineHeight: 1.7, color: 'var(--c-text)' }}><MemoDiffOps ops={ops}/></p>
        </section>
      ))}
      <div style={{ fontSize: 12.5, color: 'var(--c-text-3)' }}>
        {same.length ? t('Uændret') + ': ' + same.map(x => x.s.num).join(', ') + '.' : t('Alle afsnit er ændret.')}
      </div>
    </div>
  );
}

/* ── Dybdelink og versioner udefra ───────────────────────────────────────────
   CW_OPEN_MEMO({ section, commentId?, field? }) åbner memo-fanen og ruller
   til afsnittet, kommentaren eller det tomme felt (field = id fra
   CW_MEMO_STATUS().blankGroups). CW_OPEN_MEMO_VERSION(n, { compare }) viser
   en indstillet version skrivebeskyttet, evt. sammenlignet med den forrige.
   ──────────────────────────────────────────────────────────────────────────── */
let _memoPendingOpen = null;
function _memoGoToMemo() {
  const route = 'workspace:' + ((window.CW && CW.LIVE_CASE_ID) || 1) + ':memo';
  let cur = null;
  try { cur = localStorage.getItem('cw_route'); } catch (e) {}
  if (cur !== route && typeof window.__go === 'function') window.__go(route);
}
window.CW_OPEN_MEMO = function (target) {
  target = target || {};
  let section = target.section || (target.field ? String(target.field).split(':')[0] : null);
  if (!MEMO_SECTIONS.some(s => s.k === section)) section = null;
  _memoPendingOpen = { section, commentId: target.commentId != null ? target.commentId : null, field: target.field || null };
  _memoGoToMemo();
  setTimeout(() => { try { window.dispatchEvent(new CustomEvent('cw-memo-open')); } catch (e) {} }, 0);
  return true;
};
window.CW_OPEN_MEMO_VERSION = function (n, opts) {
  const v = Number(n);
  const snap = window.CW && CW.memoSnapshot ? CW.memoSnapshot(v) : null;
  if (!snap) { if (window.CW) CW.toast(_memoFill(t('Version {v} findes ikke.'), { v: n }), { tone: 'warn' }); return false; }
  const compare = !!(opts && opts.compare) && !!CW.memoSnapshot(v - 1);
  _memoView = { version: v, compare };
  _memoGoToMemo();
  setTimeout(() => { try { window.dispatchEvent(new CustomEvent('cw-memo-view')); } catch (e) {} }, 0);
  return true;
};

function WSMemo() {
  const [active, setActive] = React.useState("summary");
  const [focusedKey, setFocusedKey] = React.useState(null);
  const [resets, setResets] = React.useState({});
  const [tooltip, setTooltip] = React.useState(null);
  const [citeOpen, setCiteOpen] = React.useState(false);
  const [citePos, setCitePos] = React.useState({ top: 0, left: 0 });
  const [commentsVersion, setCommentsVersion] = React.useState(0);
  const [composerForKey, setComposerForKey] = React.useState(null);
  // Kommentarskinnens placering af trådene ud for afsnittene (px fra skinnens top)
  const [railPos, setRailPos] = React.useState({});
  const [railH, setRailH] = React.useState(600);
  const railViewportRef = React.useRef(null);
  const scrollRef = React.useRef(null);     // dokumentet
  const scrollRootRef = React.useRef(null); // siden der ruller (én rullebjælke)
  // Under ca. 1440 px er kommentarerne en skuffe i kanten
  const [narrow, setNarrow] = React.useState(() => window.matchMedia('(max-width: 1439px)').matches);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 1439px)');
    const on = () => { setNarrow(mq.matches); if (!mq.matches) setDrawerOpen(false); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
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

  /* Status pr. afsnit: beregnes af teksten, ikke skrevet fast. Genberegnes
     kort efter hver ændring, ikke ved hvert tastetryk. */
  const [memoVersion, setMemoVersion] = React.useState(0);
  React.useEffect(() => {
    let timer = null;
    const on = () => { clearTimeout(timer); timer = setTimeout(() => setMemoVersion(v => v + 1), 250); };
    window.addEventListener('memo-changed', on);
    return () => { clearTimeout(timer); window.removeEventListener('memo-changed', on); };
  }, []);

  // Åbne, løste og blokerende kommentarer. Tællerne i oversigten viser kun de åbne.
  // Låst version: kommentarsporet fra indstillingen (ældre versioner uden det viser det levende)
  const lockedForComments = memoLocked();
  const frozenKey = lockedForComments && lockedForComments.sections ? lockedForComments.version + ':' + lockedForComments.at : '';
  const frozenComments = React.useMemo(() => (lockedForComments && lockedForComments.sections && lockedForComments.sections.__comments) || null, [frozenKey]);
  const commentLockNote = lockedForComments
    ? (memoSubmittedAt() && !lockedForComments.past ? t('Træk indstillingen tilbage for at ændre.') : t('Tidligere version, skrivebeskyttet.'))
    : null;
  const counts = React.useMemo(() => memoCommentCounts(frozenComments), [commentsVersion, memoVersion, frozenComments]);
  const commentCounts = counts.open;

  /* Indstillet til kreditkomitéen: den frosne version vises skrivebeskyttet */
  CW.useCase();
  // Gentegnes, når en bestemt version åbnes eller lukkes (CW_OPEN_MEMO_VERSION)
  const [viewTick, setViewTick] = React.useState(0);
  const locked = memoLocked();
  const submittedAt = locked ? locked.at : null;
  const readOnly = !!locked;
  const lockKey = locked ? 'v' + locked.version + ':' + locked.at + (locked.compare ? ':c' : '') : 'live';
  const compareSnaps = locked && locked.compare ? { cur: CW.memoSnapshot(locked.version), prev: CW.memoSnapshot(locked.version - 1) } : null;
  const hasPrevVersion = !!(locked && locked.sections && CW.memoSnapshot(locked.version - 1));
  const front = locked ? locked.front : null;
  // Den indstillede version vises på indstillingssproget: forside, afsnitstitler og tekst
  const docLang = locked && locked.sections && locked.lang ? locked.lang : (MEMO_EN ? 'en' : 'da');
  const tDoc = (s) => _memoTL(docLang, s);

  // Track which sections have been manually edited (checked from localStorage on mount)
  const [modifiedSections, setModifiedSections] = React.useState(() => {
    const m = {};
    MEMO_SECTIONS.forEach(s => { if (localStorage.getItem(memoKey(s.k)) !== null) m[s.k] = true; });
    return m;
  });

  const sections = MEMO_SECTIONS;

  const lockedSecs = locked && locked.sections ? locked.sections : null;
  const statuses = React.useMemo(() => {
    const m = {};
    MEMO_SECTIONS.forEach(s => { m[s.k] = memoSectionStatus(s.k, lockedSecs && lockedSecs[s.k] != null ? lockedSecs[s.k] : null, memoLockedReview(locked, s.k)); });
    return m;
  }, [memoVersion, lockKey]);
  // Fremdriften står ét sted: "x af 14 afsnit gennemgået" i memoets top
  const reviewedCount = MEMO_SECTIONS.filter(s => statuses[s.k].reviewed).length;

  /* Dybdelink (CW_OPEN_MEMO) og versionsvisning (CW_OPEN_MEMO_VERSION) */
  const openTargetRef = React.useRef(null);
  React.useEffect(() => {
    const open = () => {
      const tgt = _memoPendingOpen;
      if (!tgt) return;
      _memoPendingOpen = null;
      if (_memoView) { _memoView = null; setViewTick(v => v + 1); }
      setTimeout(() => { if (openTargetRef.current) openTargetRef.current(tgt); }, 120);
    };
    const onView = () => {
      setViewTick(v => v + 1);
      const root = scrollRef.current && scrollRef.current.closest('.scroll');
      if (root) root.scrollTop = 0;
      CW.focusSoon('#memo-version-banner');
    };
    open();
    window.addEventListener('cw-memo-open', open);
    window.addEventListener('cw-memo-view', onView);
    return () => {
      window.removeEventListener('cw-memo-open', open);
      window.removeEventListener('cw-memo-view', onView);
      // Forlader man memoet, vises det som normalt næste gang
      _memoView = null;
    };
  }, []);
  function closeVersionView() {
    _memoView = null;
    setViewTick(v => v + 1);
    const root = scrollRef.current && scrollRef.current.closest('.scroll');
    if (root) root.scrollTop = 0;
  }
  // Markerer målet, indtil der klikkes et andet sted. Ingen animation.
  function markTarget(el) {
    if (!el) return;
    document.querySelectorAll('.memo-target').forEach(x => x.classList.remove('memo-target'));
    el.classList.add('memo-target');
    const off = () => { el.classList.remove('memo-target'); document.removeEventListener('pointerdown', off, true); };
    document.addEventListener('pointerdown', off, true);
  }
  const pinActiveRef = React.useRef(0);
  // Fanens fokus-fallback (app.jsx) kan komme efter os, når memoet er tungt at
  // tegne. Står fokus derefter på fanen eller siden, sættes det igen.
  function keepFocus(fn) {
    fn();
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || a === document.body || !a.isConnected || (a.classList && a.classList.contains('ws-tab'))) fn();
    }, 300);
  }
  openTargetRef.current = (tgt) => {
    const k = tgt.section;
    const secEl = k ? document.getElementById('ms-' + k) : null;
    if (!secEl) return;
    pinActiveRef.current = Date.now() + 1200;
    setActive(k);
    if (tgt.field) {
      const body = secEl.querySelector('.memo-body');
      const f = body ? memoBlankFields(k, body.innerHTML).find(x => x.id === tgt.field) : null;
      const el = f ? body.querySelectorAll('.tpl-blank')[f.index] : null;
      // Feltet står i skabelonens foldede vejledning (fx "bilag 2" i afsnit 6):
      // vejledningen foldes ud, og dybdelinket prøves igen, når den er tegnet
      if (el && secEl.classList.contains('guide-folded') && el.closest('.tpl-hints, .tpl-hint, .tpl-note, .tpl-guide') && !tgt.__guide) {
        window.dispatchEvent(new CustomEvent('memo-show-guide', { detail: { sKey: k } }));
        setTimeout(() => openTargetRef.current(Object.assign({}, tgt, { __guide: true })), 80);
        return;
      }
      if (el) {
        el.scrollIntoView({ block: 'center' });
        keepFocus(() => {
          try {
            // Kan der skrives i afsnittet, står markøren i feltet. Ellers får feltet selv fokus.
            if (body.isContentEditable) body.focus({ preventScroll: true });
            else { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
            const r = document.createRange();
            r.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
          } catch (e) {}
        });
        markTarget(el);
        return;
      }
    }
    secEl.scrollIntoView({ block: 'start' });
    if (tgt.commentId != null) {
      setRailTab('comments');
      if (narrow) setDrawerOpen(true);
      const q = '[data-cmt="cmt-' + k + '-' + tgt.commentId + '"]';
      let tries = 0;
      const find = () => {
        const el = document.querySelector(q);
        if (el) {
          const b = el.querySelector('button');
          if (b) keepFocus(() => b.focus({ preventScroll: true }));
          markTarget(el);
          return;
        }
        if (++tries < 30) setTimeout(find, 80);
      };
      setTimeout(find, 150);
      return;
    }
    keepFocus(() => { const h = document.getElementById('ms-' + k + '-h'); if (h) h.focus({ preventScroll: true }); });
  };

  function scrollTo(key, focus) {
    setActive(key);
    const el = document.getElementById('ms-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focus) CW.focusSoon('#ms-' + key + '-h');
  }

  /* "Markér som gennemgået og gå til næste": videre til næste afsnit, der
     stadig er et udkast. Statussen læses frisk, da den lige er ændret. */
  function nextDraftAfter(key) {
    const i = MEMO_SECTIONS.findIndex(s => s.k === key);
    const rest = MEMO_SECTIONS.slice(i + 1).concat(MEMO_SECTIONS.slice(0, i));
    const n = rest.find(s => memoSectionStatus(s.k).unreviewed);
    return n ? n.k : null;
  }
  function reviewedNext(key) {
    const n = nextDraftAfter(key);
    // Statussen tegnes om med det samme, ikke først når "memo-changed" har
    // ventet sig færdig. Ellers stod knappen i afsnittet et øjeblik endnu.
    setMemoVersion(v => v + 1);
    setTimeout(() => {
      if (n) scrollTo(n, true);
      else { CW.toast(t('Alle afsnit er gennemgået.'), { tone: 'ok' }); focusReviewed(key); }
    }, 60);
  }
  /* Knappen forsvinder, når afsnittet er gennemgået. Fokus går til linjen
     "Gennemgået af …" i samme afsnit, så man ikke havner på siden. */
  function focusReviewed(key) {
    let tries = 0;
    const go = () => {
      const el = document.getElementById('ms-' + key + '-reviewed');
      if (el) el.focus({ preventScroll: true });
      else if (++tries < 20) setTimeout(go, 60);
    };
    setTimeout(go, 60);
  }
  /* Gennemgangen er fortrudt: fokus på "Markér som gennemgået" i samme afsnit */
  function unreviewed(key) {
    setMemoVersion(v => v + 1);
    CW.focusSoon('#ms-' + key + ' .memo-review .rv-go');
  }

  function handleAddComment(key) {
    setComposerForKey(key);
    setActive(key);
    if (narrow) { setRailTab('comments'); setDrawerOpen(true); }
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

  /* Én rullebjælke: dokumentet ruller med siden (sagens rullefelt), og
     oversigten og kommentarerne står fast ved siden af. Før havde dokumentet
     og kommentaroversigten hver sin rullebjælke inde i sidens. */
  React.useEffect(() => {
    const doc = scrollRef.current;
    if (!doc) return;
    const root = doc.closest('.scroll') || document.scrollingElement;
    scrollRootRef.current = root;
    const els = sections.map(s => document.getElementById('ms-' + s.k)).filter(Boolean);
    /* Aktivt afsnit = det sidste, hvis overskrift er rullet op over en linje
       ca. en tredjedel nede i rullefeltet. Regnes ved hver rulning. Før brugte
       vi en IntersectionObserver med tærskel 0.1, men lange afsnit (fx
       Risikovurdering, 3.600 px) nåede aldrig 10 % synligt i en lav
       rude (1280 x 450 eller 200 % zoom), så markeringen blev hængende. */
    let raf = 0;
    const pick = () => {
      raf = 0;
      // Et dybdelink har lige valgt afsnittet: rulningen må ikke flytte markeringen
      if (Date.now() < pinActiveRef.current) return;
      const rr = root === document.scrollingElement ? { top: 0, height: window.innerHeight } : root.getBoundingClientRect();
      // Helt i bund kan de sidste korte afsnit ikke nå linjen: brug så hele ruden
      const sc = root === document.scrollingElement ? document.scrollingElement : root;
      const atEnd = sc.scrollTop > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
      const line = atEnd ? rr.top + rr.height - 40 : rr.top + Math.min(rr.height * 0.35, 240);
      let cur = null, best = -Infinity;
      for (const el of els) { const tp = el.getBoundingClientRect().top; if (tp <= line && tp > best) { best = tp; cur = el; } }
      if (cur) setActive(cur.id.replace('ms-', ''));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
    const target = root === document.scrollingElement ? window : root;
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    pick();
    return () => { target.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Trådene i kommentarskinnen står ud for deres afsnit. Afstanden måles fra
  // skinnens top, så det virker både i den faste skinne og i skuffen.
  const measureRail = React.useCallback(() => {
    const vp = railViewportRef.current;
    const root = scrollRootRef.current;
    if (root) {
      const rr = root === document.scrollingElement ? { top: 0, height: window.innerHeight } : root.getBoundingClientRect();
      setRailH(Math.max(320, Math.min(640, Math.round(rr.top + rr.height - (vp ? vp.getBoundingClientRect().top : rr.top + 110) - 20))));
    }
    if (!vp) return;
    const top = vp.getBoundingClientRect().top;
    const map = {};
    sections.forEach(s => {
      const el = document.getElementById('ms-' + s.k);
      if (el) { const r = el.getBoundingClientRect(); map[s.k] = { t: Math.round(r.top - top), b: Math.round(r.bottom - top) }; }
    });
    setRailPos(prev => {
      const same = Object.keys(map).every(k => prev[k] && prev[k].t === map[k].t && prev[k].b === map[k].b) && Object.keys(prev).length === Object.keys(map).length;
      return same ? prev : map;
    });
  }, []);
  React.useEffect(() => {
    const root = scrollRootRef.current || (scrollRef.current && scrollRef.current.closest('.scroll'));
    if (!root) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measureRail(); setFloatBtn(null); });
    };
    measureRail();
    root.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const ro = new ResizeObserver(onScroll);
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => { root.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [commentsVersion, narrow, drawerOpen, railTab, measureRail]);

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
      return '## ' + s.num + '. ' + t(s.label) + '\n' + (body || (MEMO_EN ? '(not written yet)' : '(ikke skrevet endnu)'));
    }).join('\n\n');
  }

  function insertFromChat(key, html) {
    const api = sectionApis.current[key];
    if (!api || !html) return;
    if (readOnly) { CW.toast(t('Memoet er indstillet og skrivebeskyttet. Træk indstillingen tilbage i sagen for at redigere.'), { tone: 'warn' }); return; }
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
    if (el && window.CW_SOURCE_VIEW === true) { hoveredCiteRef.current = el; setTooltip(computeTooltip(el)); }
  };
  const handleMouseOut = (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.memo-cite')) {
      hoveredCiteRef.current = null;
      setTooltip(null);
    }
  };
  const handleScrollInput = () => {
    if (hoveredCiteRef.current) setTooltip(computeTooltip(hoveredCiteRef.current));
    // Retter man i en henvisnings tekst, skal dens navn følge med
    const sel = window.getSelection();
    const node = sel && sel.anchorNode;
    const cite = node && (node.nodeType === 1 ? node : node.parentElement);
    const el = cite && cite.closest ? cite.closest('.memo-cite') : null;
    if (el) decorateCite(el);
  };

  /* Klik på en kildehenvisning åbner selve dokumentet på den side der henvises
     til. Et tooltip der viser et filnavn er en påstand; kilden er beviset, og
     hele pointen med sporbarheden er at man kan komme hen til den. */
  const [sourceDoc, setSourceDoc] = React.useState(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [showOrigin, setShowOrigin] = React.useState(false);

  /* Kildehenvisningerne er knapper for tastatur og skærmlæser. Sættes igen
     efter hver ændring, da AI og indsættelse kan bringe nye henvisninger ind. */
  React.useEffect(() => {
    const id = setTimeout(() => decorateCites(scrollRef.current), 30);
    return () => clearTimeout(id);
  }, [memoVersion, lockKey]);

  /* Ophavsmærkerne bærer deres etiket i en attribut, så CSS kan vise den.
     Sættes når visningen slås til, og efter at AI'en har skrevet. */
  React.useEffect(() => {
    if (!showOrigin) return;
    const timer = setTimeout(() => {
      document.querySelectorAll('.memo-doc [data-ai]').forEach(el => {
        const o = el.getAttribute('data-ai');
        const base = o === 'edited' ? t('Udkast, rettet') : o === 'chat' ? t('AI, chat') : o === 'seed' ? t('Udkast') : t('AI-udkast');
        const sec = el.closest('.memo-sec');
        const ok = sec && sec.getAttribute('data-reviewed') === '1' && !el.closest('.tpl-draft');
        el.setAttribute('data-ai-label', ok ? base + ' · ' + t('gennemgået') : base);
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [showOrigin, focusedKey, memoVersion]);

  /* Hvor meget af memoet står rådgiveren inde for? Tælles på blokke, ikke på
     tegn, fordi det er den enhed hun godkender. Skabelonens og AI'ens tekst
     er udkast indtil afsnittet er markeret som gennemgået; kun tekst uden
     ophavsmærke er hendes egen. Skabelonens vejledning tælles ikke med. */
  const originStats = React.useMemo(() => {
    if (!showOrigin) return null;
    const BLOCKS = 'p, h3, h4, ul, ol, table, blockquote';
    let draft = 0, reviewed = 0, own = 0;
    sections.forEach(s => {
      const api = sectionApis.current[s.k];
      const st = statuses[s.k];
      const d = document.createElement('div');
      d.innerHTML = api ? api.getHtml() : sectionHtml(s.k);
      d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove());
      d.querySelectorAll(BLOCKS).forEach(el => {
        // Kun yderste blokke, ellers tælles en liste og dens punkter dobbelt
        if (el.parentElement && el.parentElement.closest(BLOCKS)) return;
        if (!el.textContent.trim()) return;
        const inDraft = !!el.closest('.tpl-draft');
        const machine = inDraft || !!el.closest('[data-ai]');
        if (!machine) own++;
        else if (st && st.reviewed && !inDraft) reviewed++;
        else draft++;
      });
    });
    return { draft, reviewed, own };
  }, [showOrigin, memoVersion, statuses]);

  function openCite(el) {
    if (window.CW_SOURCE_VIEW !== true) return;
    const name = el.getAttribute('data-doc');
    const page = el.getAttribute('data-page');
    const doc = (window.CASE_DOCS || []).find(d => d.name === name);
    if (!doc) {
      CW.toast(t('Dokumentet findes ikke i sagen') + ': ' + name, { tone: 'warn' });
      return;
    }
    setSourceDoc({ doc, page, quote: (el.textContent || '').trim(), context: citeContext(el), alt: citeTwinDa(el), inCase: memoDocInCase(name) });
  }
  const handleCiteClick = (e) => {
    const el = e.target.closest('.memo-cite');
    if (!el || window.CW_SOURCE_VIEW !== true) return;
    // Ctrl eller cmd holdt nede betyder at brugeren vil redigere teksten
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    openCite(el);
  };
  // Enter eller mellemrum på en henvisning åbner kilden, som et klik
  const handleCiteKey = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target && e.target.classList && e.target.classList.contains('memo-cite') ? e.target : null;
    if (!el || window.CW_SOURCE_VIEW !== true || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    openCite(el);
  };

  /* "Generér memo" vises først, når AI er forbundet. Før stod den som en
     knap, der så slået fra ud, men kunne klikkes. */
  function onGenerateClick() {
    if (readOnly || !aiStatus.ready || (gen && gen.running)) return;
    setGenOpen(true);
  }

  const CO = (window.DATA && DATA.COMPANY) || {};

  return (
    <div className="page page-wide" style={{ maxWidth: 1320 }}>
      <div className="memo-layout">

        {/* ── Nav ── */}
        <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div className="card-title">{t('Afsnit')}</div>
          </div>
          <div style={{ padding: '6px 0 10px' }}>
            {sections.map(s => (
              <button key={s.k} onClick={() => scrollTo(s.k)} aria-current={active === s.k ? 'true' : undefined}
                title={memoStatusText(statuses[s.k])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 16px',
                  background: active === s.k ? 'var(--c-surface-2)' : 'transparent',
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  fontSize: 12.5, color: active === s.k ? 'var(--c-ink)' : 'var(--c-text-2)',
                  borderLeft: '2px solid ' + (active === s.k ? 'var(--c-ink)' : 'transparent'),
                  transition: 'all 0.1s',
                }}>
                <SectionDot st={statuses[s.k]}/>
                <span style={{ fontSize: 12, color: 'var(--c-text-3)', width: 18, flexShrink: 0 }}>{s.num}</span>
                <span style={{ flex: 1 }}>{t(s.label)}<span className="memo-sr">. {memoStatusText(statuses[s.k])}</span></span>
                {commentCounts[s.k] > 0 && (
                  <span
                    title={commentCounts[s.k] + ' ' + (commentCounts[s.k] === 1 ? t('kommentar') : t('kommentarer'))}
                    style={{ fontSize: 12, color: 'var(--c-text-3)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {commentCounts[s.k]}<span className="memo-sr"> {commentCounts[s.k] === 1 ? t('kommentar') : t('kommentarer')}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Document ── */}
        {/* overflow: clip i stedet for hidden, så værktøjslinjen kan stå fast,
            mens siden ruller */}
        <div className="card" style={{ background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'clip', minWidth: 0 }}>
          {/* Top bar */}
          {/* Titel og knapper på hver sin linje når der ikke er plads til begge.
              Før brød titlen over tre linjer og lå under knapperne. */}
          <div className="card-head" style={{ flexShrink: 0, borderBottom: '1px solid var(--c-line-2)', flexWrap: 'wrap', rowGap: 10, columnGap: 12 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <div className="card-title" style={{ whiteSpace: 'nowrap' }}>{readOnly ? t('Credit memo · indstillet version') + ' ' + locked.version : t('Credit memo · udkast')}</div>
              {/* Fremdriften og forklaringen på gennemgangen står her, én gang for hele memoet */}
              <div className="card-sub" style={{ lineHeight: 1.5 }}>
                {reviewedCount} {t('af')} {MEMO_SECTIONS.length} {t('afsnit gennemgået')}.{' '}
                {readOnly ? t('Skrivebeskyttet') + '.' : t('Læs hvert afsnit, ret det nødvendige, og markér det som gennemgået.')}
              </div>
            </div>
            {/* Ingen blå knap her: sagshovedets næste skridt er sidens eneste primærknap */}
            <div className="hstack" style={{ gap: 6, flexWrap: 'wrap', rowGap: 6 }}>
              {!readOnly && (
                <button
                  className="btn btn-sm"
                  onClick={() => setAiSettingsOpen(true)}
                  title={aiStatus.ready
                    ? t('Forbundet til') + ' ' + aiStatus.provider.label + ' (' + aiStatus.model + '). ' + t('Klik for at skifte.')
                    : t('Forbind din egen Claude-, ChatGPT- eller Copilot-konto')}
                >
                  {aiStatus.ready ? aiStatus.provider.label : t('Forbind AI')}
                </button>
              )}
              {!readOnly && aiStatus.ready && (
                <button
                  className="btn btn-sm"
                  disabled={!!(gen && gen.running)}
                  onClick={onGenerateClick}
                  title={t('Lad AI skrive memoet ud fra dokumenterne, periodetallene og årsregnskaberne')}
                >
                  {t('Generér memo')}
                </button>
              )}
              <button
                className="btn btn-sm"
                onClick={() => setShowOrigin(v => !v)}
                aria-pressed={showOrigin}
                title={t('Vis hvad der er udkast fra skabelonen eller AI, hvad du har gennemgået, og hvad du selv har skrevet')}
                style={showOrigin ? { borderColor: 'var(--c-ink)', background: 'var(--c-ink)', color: '#fff' } : undefined}
              >
                {showOrigin ? t('Skjul ophav') : t('Vis ophav')}
              </button>
              <button
                type="button"
                id="memo-export-btn"
                className="btn btn-sm"
                aria-haspopup="dialog"
                onClick={() => setExportOpen(true)}
                title={t('Det der står på skærmen, med udkastmærker')}
              >
                {t('Eksportér til Word')}
              </button>
            </div>
          </div>

          {/* Indstillet: memoet er låst, og det skal siges hvorfor og hvordan man låser op */}
          {readOnly && (
            <div role="status" id="memo-version-banner" tabIndex={-1} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', flexWrap: 'wrap', outline: 'none',
              background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-line-2)',
              fontSize: 12.5, color: 'var(--c-ink)', lineHeight: 1.5,
            }}>
              <span aria-hidden="true" style={{ color: 'var(--c-text-2)' }}>✓</span>
              <span style={{ flex: 1, minWidth: 240 }}>
                <b style={{ fontWeight: 600 }}>{t('Indstillet version')} {locked.version}, {_memoFmtDay(locked.at)}.</b>{' '}
                {locked.compare ? _memoFill(t('Sammenlignet med version {v}.'), { v: locked.version - 1 })
                  : locked.past ? t('Tidligere version, skrivebeskyttet.')
                  : t('Træk indstillingen tilbage i sagen for at redigere.')}
                {!locked.sections && <> {t('Der blev ikke gemt en kopi ved indstillingen, så det viste er kladden.')}</>}
                {locked.lang && locked.lang !== (MEMO_EN ? 'en' : 'da') && <> {locked.lang === 'da' ? t('Versionen blev indstillet på dansk og vises, som den blev indstillet.') : t('Versionen blev indstillet på engelsk og vises, som den blev indstillet.')}</>}
              </span>
              <span className="hstack" style={{ gap: 6, flexWrap: 'wrap' }}>
                {hasPrevVersion && !locked.compare && (
                  <button type="button" className="btn btn-sm" onClick={() => window.CW_OPEN_MEMO_VERSION(locked.version, { compare: true })}>
                    {_memoFill(t('Sammenlign med version {v}'), { v: locked.version - 1 })}
                  </button>
                )}
                {locked.compare && (
                  <button type="button" className="btn btn-sm" onClick={() => window.CW_OPEN_MEMO_VERSION(locked.version, { compare: false })}>
                    {_memoFill(t('Vis version {v}'), { v: locked.version })}
                  </button>
                )}
                {hasPrevVersion && (
                  <button type="button" className="btn btn-sm" onClick={() => window.CW_OPEN_MEMO_VERSION(locked.version - 1, { compare: false })}>
                    {_memoFill(t('Åbn version {v}'), { v: locked.version - 1 })}
                  </button>
                )}
                {(locked.past || locked.compare) && (
                  <button type="button" className="btn btn-sm" onClick={closeVersionView}>
                    {memoSubmittedAt() ? t('Til den gældende version') : t('Tilbage til udkastet')}
                  </button>
                )}
              </span>
            </div>
          )}

          {exportOpen && <ExportDialog sections={sections} onClose={() => { setExportOpen(false); CW.focusSoon('#memo-export-btn'); }}/>}
          {sourceDoc && (
            <SourceViewer
              doc={sourceDoc.doc}
              page={sourceDoc.page}
              quote={sourceDoc.quote}
              context={sourceDoc.context}
              alt={sourceDoc.alt}
              inCase={sourceDoc.inCase}
              onClose={() => setSourceDoc(null)}
            />
          )}

          {/* Fremgang under generering */}
          {gen && (
            <div className="ai-progress">
              {gen.error ? (
                <span style={{ color: '#b03030', flex: 1 }}>{gen.error}</span>
              ) : gen.running ? (
                <>
                  <span style={{ minWidth: 210 }}>{t('Skriver')} {gen.index + 1} {t('af')} {gen.keys.length}: {t(gen.label)}</span>
                  <span className="ai-progress-bar"><span style={{ width: Math.round((gen.index / gen.keys.length) * 100) + '%' }}/></span>
                  <button className="btn btn-sm" onClick={stopGeneration}>{t('Stop')}</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>
                    {gen.written.length} {t('af')} {gen.keys.length} {t('afsnit skrevet. Gennemgå teksten og ret det der skal rettes.')}
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setGen(null)}>{t('Luk')}</button>
                </>
              )}
            </div>
          )}

          {/* Toolbar */}
          {!readOnly && <MemoToolbar focusedKey={focusedKey} citeOpen={citeOpen} onOpenCitePicker={openCitePicker} onReset={resetSection}/>}

          {showOrigin && originStats && (
            <div className="memo-origin-stats" style={{
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              padding: '9px 20px', borderBottom: '1px solid var(--c-line-2)',
              background: 'var(--c-surface-2)', fontSize: 12, color: 'var(--c-text-2)',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 13, background: '#7c8cf8', borderRadius: 2 }}/>
                {originStats.draft} {t('blokke er udkast, ikke gennemgået')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 13, background: 'var(--c-success)', borderRadius: 2 }}/>
                {originStats.reviewed} {t('gennemgået af rådgiver')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 13, background: 'transparent', border: '1px solid var(--c-line-strong)', borderRadius: 2 }}/>
                {originStats.own} {t('skrevet af dig')}
              </span>
              <span style={{ flex: 1 }}/>
              <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>
                {t('Udkast fra skabelonen og AI forbliver udkast, også når du retter i dem, indtil du markerer afsnittet som gennemgået.')}
              </span>
            </div>
          )}

          {/* Scrollable doc body */}
          <div
            ref={scrollRef}
            /* Dokumentet ruller med siden. Før havde det sin egen rullebjælke
               inde i sidens, og kommentaroversigten en tredje. */
            className={'memo-doc' + (showOrigin ? ' show-origin' : '')}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onInput={handleScrollInput}
            onClick={handleCiteClick}
            onKeyDown={handleCiteKey}
          >
            {compareSnaps && compareSnaps.cur && compareSnaps.prev ? (
              <MemoCompareView cur={compareSnaps.cur} prev={compareSnaps.prev}/>
            ) : (<>
            <MemoNewMaterialBanner version={memoVersion}/>
            {/* Tastaturgenvej forbi forsiden og boksens mange kildehenvisninger.
                Skjult, til den får fokus med Tab. */}
            <a href="#ms-background-h" className="skip-link" onClick={e => { e.preventDefault(); scrollTo(sections[0] ? sections[0].k : 'background', true); }}>
              {t('Spring til afsnit 1')}
            </a>
            {/* Doc header (non-editable) — følger EIFO Kreditindstilling-template */}
            <div style={{ borderBottom: '2px solid var(--c-ink)', paddingBottom: 18, marginBottom: 28 }}>
              <div className="label-mini" style={{ marginBottom: 4 }}>{tDoc('Kreditindstilling')}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>{CO.name || 'Nordhavn Composite A/S'}</div>
              <div style={{ fontSize: 14, color: 'var(--c-ink)', marginTop: 10, lineHeight: 1.6 }}>
                {tDoc('Indstilling af')} <span className="tpl-pill">{tDoc('nyt engagement')}</span> {tDoc('til')} <span className="tpl-pill">{tDoc('Kreditkomité')}</span>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12.5, color: 'var(--c-text-2)' }}>
                <span>{tDoc('Kreditrisiko:')} <span className="tpl-pill">{front ? front.risk : memoRisk()}</span></span>
                <span>{tDoc('Kundetype:')} <span className="tpl-pill">{tDoc('Erhverv, SMV')}</span></span>
              </div>

              {/* Virksomhed-tabel: 2-kolonne som i EIFO-template */}
              <div style={{ marginTop: 16, fontSize: 12, fontWeight: 500, color: 'var(--c-text-2)' }}>{tDoc('Virksomhed')}</div>
              <table style={{ width: '100%', marginTop: 6, fontSize: 12, borderCollapse: 'collapse', border: '1px solid var(--c-line)' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--c-line)', verticalAlign: 'top', width: '50%' }}>
                      <div style={{ color: 'var(--c-text-3)', fontSize: 11, marginBottom: 2 }}>{tDoc('EIFO direkte investering / ejerandel')}</div>
                      <div style={{ color: 'var(--c-text-4)', fontStyle: 'italic', fontSize: 11.5 }}>{tDoc('Ikke relevant for denne sag.')}</div>
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 4, columnGap: 8 }}>
                        <span style={{ color: 'var(--c-text-3)' }}>{tDoc('Dato:')}</span><span style={{ color: 'var(--c-ink)' }} className="memo-date">{memoDate(locked, docLang)}</span>
                        <span style={{ color: 'var(--c-text-3)' }}>CVR:</span><span style={{ color: 'var(--c-ink)', fontFamily: 'var(--mono)' }}>{CO.cvr || ''}</span>
                        <span style={{ color: 'var(--c-text-3)' }}>{tDoc('Branche:')}</span><span style={{ color: 'var(--c-ink)' }}>{tDoc('Vindmøllekomponenter / komposit')}</span>
                      </div>
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--c-line)' }}>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--c-line)', verticalAlign: 'top' }}>
                      <div style={{ color: 'var(--c-text-3)', fontSize: 11, marginBottom: 2 }}>{tDoc('Dispensation fra acceptkriterie')}</div>
                      <div style={{ color: 'var(--c-ink)' }}>{tDoc('Ingen')}</div>
                      <div style={{ color: 'var(--c-text-4)', fontStyle: 'italic', fontSize: 11, marginTop: 4 }}>{tDoc('(Maks. to linjer med kreditmæssig begrundelse ved evt. dispensation)')}</div>
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 4, columnGap: 8 }}>
                        <span style={{ color: 'var(--c-text-3)' }}>{tDoc('Sagsnr.:')}</span><span style={{ color: 'var(--c-ink)' }}>{CO.caseNr || ''}</span>
                        <span style={{ color: 'var(--c-text-3)' }}>{tDoc('Primær:')}</span><span style={{ color: 'var(--c-ink)' }}>{tDoc('Mette Larsen, Kredit')}</span>
                        <span style={{ color: 'var(--c-text-3)' }}>{tDoc('Sekundær:')}</span><span style={{ color: 'var(--c-ink)' }}>{tDoc('Sofie Andersen, Erhverv')}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Side 1: indstillingen i hovedtræk, fra faktaarket */}
              {/* Indstillet: forsiden, som den blev frosset. Ældre versioner uden den viser den levende uden "Udkast:" */}
              <MemoFactsBox onJump={(k) => scrollTo(k, true)} rows={front ? front.facts : memoFacts({ final: !!locked })} lang={docLang}/>
            </div>

            {sections.map((s, i) => (
              <MemoSection
                key={s.k + ':' + lockKey}
                id={'ms-' + s.k}
                docLang={locked ? docLang : null}
                onUnreviewed={unreviewed}
                isActive={active === s.k}
                sKey={s.k}
                num={s.num}
                title={s.label}
                st={statuses[s.k]}
                readOnly={readOnly}
                lockedHtml={lockedSecs && lockedSecs[s.k] != null ? lockedSecs[s.k] : null}
                onReviewedNext={reviewedNext}
                onConnectAi={() => setAiSettingsOpen(true)}
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
            <MemoAppendixNote readOnly={readOnly} version={memoVersion}/>
            </>)}
          </div>
        </div>

        {/* ── Højre skinne: kommentarer eller sagschat. Under ca. 1440 px en
            smal knap i kanten, der åbner en skuffe. ── */}
        {(() => {
          const rail = (
            <>
              {/* Understregede faner som sagens faner (.cw-tabs) */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
                <div className="cw-tabs" role="tablist" aria-label={t('Kommentarer og spørgsmål')} style={{ flex: 1, gap: 16 }}>
                  {[
                    { k: 'comments', l: t('Kommentarer'), n: counts.openTotal },
                    { k: 'ai', l: t('Spørg om sagen'), n: 0 },
                  ].map(tb => {
                    const on = railTab === tb.k;
                    return (
                      <button key={tb.k} type="button" role="tab" aria-selected={on} onClick={() => setRailTab(tb.k)} style={{ fontSize: 13 }}>
                        {tb.l}
                        {tb.n > 0 && <span className="n">{tb.n}</span>}
                      </button>
                    );
                  })}
                </div>
                {narrow && (
                  <button type="button" className="btn-ghost-sm" onClick={() => setDrawerOpen(false)} aria-label={t('Luk kommentarer')}>{t('Luk')}</button>
                )}
              </div>
              {railTab === 'comments' ? (
                <MemoCommentsRail
                  sections={sections}
                  positions={railPos}
                  viewportRef={railViewportRef}
                  height={railH}
                  activeKey={active}
                  composerForKey={composerForKey}
                  onComposerToggle={setComposerForKey}
                  onChanged={() => setCommentsVersion(v => v + 1)}
                  scrollToSection={scrollTo}
                  counts={counts}
                  version={commentsVersion + ':' + memoVersion}
                  frozen={frozenComments}
                  lockNote={commentLockNote}
                />
              ) : (
                <window.MemoAI.AiChatPanel
                  open
                  getMemoText={memoAsText}
                  sections={sections}
                  onInsert={insertFromChat}
                />
              )}
            </>
          );
          if (!narrow) return <div style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>{rail}</div>;
          return (
            <div style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
              <button type="button" className="memo-rail-tab" id="memo-rail-toggle"
                aria-expanded={drawerOpen} aria-controls="memo-drawer"
                onClick={() => setDrawerOpen(v => !v)}
                title={t('Vis kommentarer og spørg om sagen')}>
                <span className="v">{t('Kommentarer')}</span>
                {counts.openTotal > 0 && <span className="n" aria-label={counts.openTotal + ' ' + t('åbne')}>{counts.openTotal}</span>}
                {counts.blocking > 0 && <span className="n block" title={counts.blocking + ' ' + t('blokerer indstilling')} aria-label={counts.blocking + ' ' + t('blokerer indstilling')}>!</span>}
              </button>
              {drawerOpen && (
                <MemoDrawer onClose={() => { setDrawerOpen(false); CW.focusSoon('#memo-rail-toggle'); }}>{rail}</MemoDrawer>
              )}
            </div>
          );
        })()}

      </div>

      {/* Flydende knap ved markeret tekst */}
      {floatBtn && aiStatus.ready && !readOnly && (
        <button
          className="ai-float"
          style={{ left: floatBtn.x, top: floatBtn.y - 10, transform: 'translate(-50%, -100%)' }}
          onMouseDown={(e) => { e.preventDefault(); openSelectionAi(); }}
        >
          {t('Omskriv markeringen')}
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
          role="dialog"
          aria-label={t('Indsæt kildehenvisning')}
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
          onKeyDown={e => {
            // Pil op og ned mellem dokumenterne, Esc lukker og går tilbage til teksten
            const items = Array.from(e.currentTarget.querySelectorAll('button'));
            const i = items.indexOf(document.activeElement);
            if (e.key === 'Escape') { e.preventDefault(); setCiteOpen(false); _memoRestoreSelection(); }
            else if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[(i + 1) % items.length].focus(); }
            else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
          }}
          ref={el => { if (el && !el.contains(document.activeElement)) { const b = el.querySelector('button'); if (b) setTimeout(() => b.focus(), 0); } }}
          style={{
            position: 'fixed', top: citePos.top, left: citePos.left,
            width: 340, background: '#fff',
            border: '1px solid var(--c-line-strong)', borderRadius: 8,
            boxShadow: '0 8px 28px rgba(0,0,0,0.14)', zIndex: 9999,
            maxHeight: 320, overflowY: 'auto',
          }}
        >
          <div style={{ padding: '8px 14px 6px', fontSize: 12, color: 'var(--c-text-2)', fontWeight: 500, borderBottom: '1px solid var(--c-line-2)' }}>
            {t('Dokumenter i sagen')}
          </div>
          {((window.DATA && DATA.DOCS) || []).filter(doc => doc.origin !== 'export').map(doc => (
            <button
              type="button"
              key={doc.name}
              onClick={() => insertCiteDoc(doc)}
              style={{ width: '100%', padding: '9px 14px', cursor: 'pointer', fontSize: 12.5, display: 'flex', gap: 10, alignItems: 'center', border: 0, borderBottom: '1px solid var(--c-line-2)', background: 'transparent', fontFamily: 'inherit', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onFocus={e => e.currentTarget.style.background = 'var(--c-surface-2)'}
              onBlur={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ flexShrink: 0, fontSize: 10.5, color: 'var(--c-text-3)', background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 4, padding: '1px 5px' }}>{t(doc.type)}</span>
              <span style={{ flex: 1, color: 'var(--c-ink)' }}>{doc.name}</span>
              {doc.year && <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{doc.year}</span>}
            </button>
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
          {tooltip.page && <div style={{ opacity: 0.72, fontSize: 10.5 }}>{memoRefLabel(tooltip.page)}</div>}
          {(tooltip.manual || tooltip.edited) && (
            <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 10, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 4 }}>
              {tooltip.manual
                ? <><span style={{ opacity: 0.6 }}>✎</span> {t('Tilføjet manuelt')}</>
                : <><span style={{ opacity: 0.6 }}>✎</span> {t('Afsnit redigeret af bruger')}</>
              }
            </div>
          )}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '5px solid transparent', borderTopColor: '#1a1d22' }}/>
        </div>
      )}
    </div>
  );
}

/* En fejl i memoet må ikke gøre hele appen hvid. Grænsen viser en rolig
   besked med mulighed for at prøve igen; resten af sagen virker videre. */
class MemoErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { try { console.warn('Memoet kunne ikke vises:', err && err.message); } catch (e) {} }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="page page-wide" style={{ maxWidth: 720 }}>
        <div className="card" role="alert" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 6 }}>{t('Memoet kunne ikke vises lige nu')}</div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.55, marginBottom: 14 }}>{t('Teksten er gemt. Prøv igen, eller genindlæs siden.')}</div>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => this.setState({ err: null })}>{t('Prøv igen')}</button>
        </div>
      </div>
    );
  }
}

// Den egentlige komponent gemmes, før det globale navn peges om på grænsen
const WSMemoInner = WSMemo;
window.WSMemo = function WSMemoSafe(props) {
  return <MemoErrorBoundary><WSMemoInner {...props}/></MemoErrorBoundary>;
};
