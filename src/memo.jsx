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
    .memo-body .memo-cite { border-bottom: 1.5px dotted var(--c-primary); cursor: help; }
    .memo-body:focus-within { background: rgba(59,130,246,0.018); border-radius: 6px; }
    .memo-tb { display: inline-flex; align-items: center; justify-content: center; height: 26px; min-width: 26px; padding: 0 6px; border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer; font-size: 13px; font-family: inherit; color: var(--c-text-2); transition: all 0.1s; flex-shrink: 0; }
    .memo-tb:hover { background: var(--c-surface-2); border-color: var(--c-line); color: var(--c-ink); }
    .memo-tb.on { background: var(--c-line-2); color: var(--c-ink); border-color: var(--c-line-strong); }
    .memo-tb-sep { width: 1px; height: 18px; background: var(--c-line); margin: 0 2px; flex-shrink: 0; display: inline-block; }
  `;
  document.head.appendChild(s);
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

/* ── Section default HTML content ─────────────────────────────────────────── */
const SEC = {
  summary: `<p>Nordhavn Composite A/S ansøger om <strong><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">DKK&nbsp;4,5M</span></strong> i form af kombineret eksportkaution og driftskredit til finansiering af <span class="memo-cite" data-doc="GE_Vernova_kontrakt.pdf" data-page="s. 1 -projektoversigt">Block-Island ordren fra GE&nbsp;Vernova</span> med leverance Q3&nbsp;2026.</p><p>Selskabet har siden 2017 udviklet sig fra et nicheværksted til en etableret leverandør af kompositkomponenter til vindmølleindustrien med en omsætning på <strong><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 3 -Hoved- og nøgletal">DKK&nbsp;18,5M</span></strong> (2025) og en EBITDA-margin på <strong><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9 -Nøgletal">12,6%</span></strong>. <span class="memo-cite" data-doc="Periodetal_Q1-2026.xlsx" data-page="ark Kunder">Tre kunder udgør ca. 64% af omsætningen.</span></p><blockquote><strong>Foreløbig vurdering:</strong> God finansiel udvikling, sund kapitalstruktur, men afhængighed af få kunder og en uafklaret budgetafvigelse i juli 2026 bør drøftes inden indstilling. Sikkerhedsdokumentation under afklaring.</blockquote>`,

  company: `<p>Nordhavn Composite ApS blev stiftet i <span class="memo-cite" data-doc="CVR-udtræk 30. maj 2026" data-page="Stiftelsesdato">2017</span> af Anders Christensen og Maria Lindbjerg. Selskabet har hovedkontor i Frederikshavn med produktion i Vendsyssel og <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 2 -Selskabsoplysninger">28 ansatte</span>. <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 2 -Datterselskaber">Datterselskaber omfatter Nordhavn Production ApS (100%) og Nordhavn US Inc. (100%)</span>.</p>`,

  product: `<p>Selskabet producerer fiberforstærkede kompositkomponenter, primært til vindmølleblade. Det globale marked forventes at vokse <span class="memo-cite" data-doc="WindEurope_Market_2025.pdf" data-page="s. 14, figur 3">6,8%&nbsp;p.a. i 2025–2030</span>. Nordhavn differentierer sig på evnen til at levere korte serier med hurtig omstilling, som giver fleksibilitet over for OEM-kunder som <span class="memo-cite" data-doc="GE_Vernova_kontrakt.pdf" data-page="s. 1">Vestas og GE&nbsp;Vernova</span>.</p>`,

  competitors: `<p>Markedet domineres af captive-producenter (Vestas Blades, Siemens Gamesa) der primært leverer internt. Uafhængige leverandører inkluderer LM Wind Power og TPI Composites. Nordhavn konkurrerer i et nichesegment med kortere serier, hvor de store aktører typisk ikke er rentable.</p><table><thead><tr><th>Aktør</th><th>Fokus</th><th style="text-align:right">Est. omsætning</th></tr></thead><tbody><tr><td>LM Wind Power</td><td>Standard vindmølleblade, globalt</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="WindEurope_Market_2025.pdf" data-page="s. 22">~2.000M</span></td></tr><tr><td>TPI Composites</td><td>Kontraktproduktion, store serier</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="WindEurope_Market_2025.pdf" data-page="s. 23">~400M</span></td></tr><tr><td><strong>Nordhavn Composite</strong></td><td>Specialkomponenter, korte serier</td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6">18,5M</span></td></tr></tbody></table>`,

  ownership: `<p>Selskabet er ejet af <span class="memo-cite" data-doc="Ejerbog_2026.pdf" data-page="s. 1">Anders Christensen (51,8% direkte) og Anders Holding ApS (48,2%)</span>. Ingen ekstern funding eller venturekapital.</p><p>Anders Holding ApS har ydet et <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14 -Anpartshaverlån">anpartshaverlån på DKK&nbsp;0,5M</span>. <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 14 -Anpartshaverlån">Lånet er rentebærende (CIBOR + 2%) og forfalder 2028</span>. Der foreligger endnu ingen tilbagetrædelseserklæring.</p>`,

  financials: `<p>Selskabet har vist stærk og konsekvent vækst over de seneste tre år med stigende EBITDA-margin og positiv egenkapitaludvikling.</p><table><thead><tr><th>DKK M</th><th style="text-align:right">2023</th><th style="text-align:right">2024</th><th style="text-align:right">2025</th></tr></thead><tbody><tr><td>Omsætning</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6">12,8</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6">15,2</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6">18,5</span></td></tr><tr><td>EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 7">1,3</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 7">1,9</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">2,4</span></td></tr><tr><td>Egenkapital</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 8">3,5</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">4,8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">6,2</span></td></tr></tbody></table>`,

  budget: `<p>Selskabets budget 2026 angiver en primo egenkapital på <strong><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197, primo EK">DKK&nbsp;4,2M</span></strong>, men årsrapporten 2025 opgiver en slutegenkapital på <strong><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8 -egenkapital note">DKK&nbsp;6,2M</span></strong> -en positiv difference på <strong>DKK&nbsp;2,0M</strong>, som endnu ikke er forklaret.</p><table><thead><tr><th>Post</th><th style="text-align:right">Budget 2026</th><th style="text-align:right">Realiseret 2025</th><th style="text-align:right">Afvigelse</th></tr></thead><tbody><tr><td>Primo egenkapital</td><td style="text-align:right;font-family:monospace;color:var(--c-warn)"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197, primo EK">4,2M</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">6,2M</span></td><td style="text-align:right;font-family:monospace;color:var(--c-warn);font-weight:600">−2,0M ⚠</td></tr><tr><td>Omsætning (helår)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="ark Resultat, helår">22,5M</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6">18,5M</span></td><td style="text-align:right;font-family:monospace">+4,0M</td></tr></tbody></table>`,

  kpi: `<table><thead><tr><th>Nøgletal</th><th style="text-align:right">2023</th><th style="text-align:right">2024</th><th style="text-align:right">2025</th></tr></thead><tbody><tr><td>EBITDA-margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9">10,2%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9">12,5%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">12,6%</span></td></tr><tr><td>Soliditetsgrad</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9">37%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9">43%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">44%</span></td></tr><tr><td>Afkast af EK</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9">8,6%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9">14,6%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">16,1%</span></td></tr><tr><td>Gæld / EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 9">3,2×</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 9">2,6×</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">2,1×</span></td></tr></tbody></table>`,

  risk: `<ul><li><strong>Kundekoncentration:</strong> <span class="memo-cite" data-doc="Periodetal_Q1-2026.xlsx" data-page="ark Kunder">Top-3 kunder udgør 64% af omsætningen</span>. <span class="memo-cite" data-doc="Periodetal_Q1-2026.xlsx" data-page="ark Kunder">GE Vernova alene ~38%</span>.</li><li><strong>Råvarepriser:</strong> <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18 -risici">Kulfiber +22% YoY</span> -<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18 -risici">prissikring dækker kun 60% af forbruget</span>.</li><li><strong>Valutaeksponering:</strong> <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18 -risici">41% af omsætning faktureres i USD/EUR</span> -ingen formel hedging-politik dokumenteret.</li><li><strong>Leverancerisiko:</strong> <span class="memo-cite" data-doc="GE_Vernova_kontrakt.pdf" data-page="§3 -Leveringsplan">Block-Island leverance Q3 2026</span> er kritisk for likviditeten -forsinkelse påvirker kassebeholdning direkte.</li></ul>`,

  security: `<p>Kreditfaciliteten understøttes af pant og kautioner med en samlet sikkerhedsværdi på ca. DKK&nbsp;7,7M over for et kreditbeløb på <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">DKK&nbsp;4,5M</span> (dækning ~171%).</p><table><thead><tr><th>Sikkerhed</th><th style="text-align:right">Værdi</th><th>Status</th></tr></thead><tbody><tr><td>Virksomhedspant (maskiner)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Pantebrev_maskiner.pdf" data-page="§1 -pantobjekt">2,8M</span></td><td>Tinglyst</td></tr><tr><td>Pant, Havnegade 47</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Tinglysning_Havnegade.pdf" data-page="Tinglyst 14. jan 2026">1,8M</span></td><td>Tinglyst</td></tr><tr><td>Debitorpant (Vestas, GE)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Debitorpant_aftale.pdf" data-page="§1 -pantobjekter">1,2M</span></td><td>Tinglyst</td></tr><tr><td>Personlig kaution, A. Christensen</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Personlig_kaution_AC.pdf" data-page="s. 1 -omfang">0,5M</span></td><td>Underskrevet</td></tr><tr><td>Tilbagetrædelseserklæring</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Selskabskaution_AH.pdf" data-page="Afventer underskrift">0,5M</span></td><td>⚠ Mangler</td></tr></tbody></table>`,

  open: `<ul><li>Forklaring på difference: <span class="memo-cite" data-doc="Budget_2026-28_v3.xlsx" data-page="linje 197">budget primo EK 4,2M</span> vs. <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">årsrapport 6,2M</span></li><li>Tilbagetrædelseserklæring for <span class="memo-cite" data-doc="Selskabskaution_AH.pdf" data-page="Afventer underskrift">anpartshaverlån 0,5M</span> -anmodet, afventer underskrift</li><li>Specifikation af kautionsobjekter i <span class="memo-cite" data-doc="Pantebrev_maskiner.pdf" data-page="§4">Pantebrev_maskiner.pdf §4</span></li></ul>`,

  rec: ``,

  appendix: `<table><thead><tr><th style="width:28px">#</th><th>Dokument</th><th>Type</th><th>Dato</th></tr></thead><tbody><tr><td style="font-family:monospace;color:#8a9099">1</td><td>Aarsrapport_2025.pdf</td><td>Årsrapport</td><td style="color:#8a9099">28. apr 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">2</td><td>Aarsrapport_2024.pdf</td><td>Årsrapport</td><td style="color:#8a9099">15. apr 2025</td></tr><tr><td style="font-family:monospace;color:#8a9099">3</td><td>Budget_2026-28_v3.xlsx</td><td>Budget</td><td style="color:#8a9099">24. maj 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">4</td><td>Periodetal_Q1-2026.xlsx</td><td>Periodetal</td><td style="color:#8a9099">12. apr 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">5</td><td>Pantebrev_maskiner.pdf</td><td>Sikkerhed</td><td style="color:#8a9099">3. feb 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">6</td><td>Tinglysning_Havnegade.pdf</td><td>Sikkerhed</td><td style="color:#8a9099">14. jan 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">7</td><td>Personlig_kaution_AC.pdf</td><td>Kaution</td><td style="color:#8a9099">10. mar 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">8</td><td>Selskabskaution_AH.pdf</td><td>Kaution</td><td style="color:#8a9099">10. mar 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">9</td><td>Ejerbog_2026.pdf</td><td>Selskab</td><td style="color:#8a9099">1. jan 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">10</td><td>GE_Vernova_kontrakt.pdf</td><td>Kontrakt</td><td style="color:#8a9099">14. feb 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">11</td><td>Debitorpant_aftale.pdf</td><td>Sikkerhed</td><td style="color:#8a9099">3. feb 2026</td></tr><tr><td style="font-family:monospace;color:#8a9099">12</td><td>CVR_udtraek_2026-05-30.pdf</td><td>Offentligt</td><td style="color:#8a9099">30. maj 2026</td></tr></tbody></table>`,
};

/* ── Sources per section ──────────────────────────────────────────────────── */
const MEMO_SOURCES = {
  summary:     [{ t: "Aarsrapport_2025.pdf", p: "s. 3, s. 9, note 14" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197" }, { t: "Periodetal_Q1-2026.xlsx", p: "ark Omsætning" }, { t: "GE_Vernova_kontrakt.pdf", p: "s. 1 -projektoversigt" }],
  company:     [{ t: "Aarsrapport_2025.pdf", p: "s. 2 -Selskabsoplysninger" }, { t: "CVR-udtræk 30. maj 2026", p: "Stiftelsesdato, adresse, ansatte" }, { t: "Ejerbog_2026.pdf", p: "s. 2 -Datterselskaber" }],
  product:     [{ t: "nordhavncomposites.dk", p: "Produktsider, hentet 4. jun 2026" }, { t: "WindEurope_Market_2025.pdf", p: "s. 14, figur 3" }, { t: "GE_Vernova_kontrakt.pdf", p: "s. 1" }],
  competitors: [{ t: "WindEurope_Market_2025.pdf", p: "s. 22–24" }, { t: "Aarsrapport_2025.pdf", p: "s. 4 -Markedsforhold, s. 6" }],
  ownership:   [{ t: "Ejerbog_2026.pdf", p: "s. 1" }, { t: "CVR-udtræk 30. maj 2026", p: "Kapitalforhold" }, { t: "Aarsrapport_2025.pdf", p: "note 14 -Anpartshaverlån" }],
  financials:  [{ t: "Aarsrapport_2025.pdf", p: "s. 6–8" }, { t: "Aarsrapport_2024.pdf", p: "s. 6–7" }, { t: "Periodetal_Q1-2026.xlsx", p: "ark Omsætning, EBITDA" }],
  budget:      [{ t: "Budget_2026-28_v3.xlsx", p: "linje 197, ark Resultat" }, { t: "Aarsrapport_2025.pdf", p: "s. 6, s. 8 -egenkapital note" }],
  kpi:         [{ t: "Aarsrapport_2025.pdf", p: "s. 9 -Nøgletal" }, { t: "Aarsrapport_2024.pdf", p: "s. 9 -Nøgletal" }, { t: "Aarsrapport_2023.pdf", p: "s. 9 -Nøgletal" }],
  risk:        [{ t: "Periodetal_Q1-2026.xlsx", p: "ark Kunder" }, { t: "Aarsrapport_2025.pdf", p: "note 18 -risici" }, { t: "GE_Vernova_kontrakt.pdf", p: "§3 -Leveringsplan" }],
  security:    [{ t: "Pantebrev_maskiner.pdf", p: "§4" }, { t: "Tinglysning_Havnegade.pdf", p: "Tinglyst 14. jan 2026" }, { t: "Personlig_kaution_AC.pdf", p: "s. 1" }, { t: "Debitorpant_aftale.pdf", p: "§1 -pantobjekter" }, { t: "Selskabskaution_AH.pdf", p: "Afventer underskrift" }],
  open:        [{ t: "Budget_2026-28_v3.xlsx", p: "linje 197, juli 2026" }, { t: "Selskabskaution_AH.pdf", p: "Afventer underskrift" }],
  rec:         [],
  appendix:    [{ t: "Dokumentliste", p: "12 dokumenter i sagsmappen" }],
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

/* ── MemoSection ──────────────────────────────────────────────────────────── */
function MemoSection({ id, sKey, num, title, status, onFocusSection, resetTrigger }) {
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

  // Reset when parent signals
  React.useEffect(() => {
    if (resetTrigger === 0) return;
    localStorage.removeItem(storageKey);
    if (ref.current) ref.current.innerHTML = defaultHtml;
    setModified(false);
  }, [resetTrigger]);

  const handleInput = () => {
    if (!ref.current) return;
    localStorage.setItem(storageKey, ref.current.innerHTML);
    setModified(true);
    onFocusSection(sKey, true);
  };

  const handlePaste = (e) => {
    // Paste as plain text to avoid polluting the doc with external HTML
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); }
  };

  const isPlaceholder = false;

  return (
    <div id={id} style={{ marginBottom: 34, scrollMarginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--c-text-4)', width: 20, flexShrink: 0 }}>{num}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', flex: 1 }}>{title}</h3>
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
        onMouseUp={() => { _memoLastEditable = ref.current; _memoSaveSelection(); }}
        onKeyUp={() => { _memoLastEditable = ref.current; _memoSaveSelection(); }}
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
    </div>
  );
}

/* ── WSMemo ───────────────────────────────────────────────────────────────── */
function WSMemo() {
  const [active, setActive] = React.useState("summary");
  const [focusedKey, setFocusedKey] = React.useState(null);
  const [resets, setResets] = React.useState({});
  const [tooltip, setTooltip] = React.useState(null);
  const [citeOpen, setCiteOpen] = React.useState(false);
  const [citePos, setCitePos] = React.useState({ top: 0, left: 0 });
  const scrollRef = React.useRef(null);
  const hoveredCiteRef = React.useRef(null);

  // Track which sections have been manually edited (checked from localStorage on mount)
  const [modifiedSections, setModifiedSections] = React.useState(() => {
    const keys = ['summary','company','product','competitors','ownership','financials','budget','kpi','risk','security','open','rec','appendix'];
    const m = {};
    keys.forEach(k => { if (localStorage.getItem('memo4:' + k) !== null) m[k] = true; });
    return m;
  });

  const sections = [
    { k: "summary",     num: "1",  label: "Executive summary",       status: "draft" },
    { k: "company",     num: "2",  label: "Virksomhedsbeskrivelse",   status: "ok"    },
    { k: "product",     num: "3",  label: "Produkt og marked",        status: "ok"    },
    { k: "competitors", num: "4",  label: "Konkurrenter",             status: "ok"    },
    { k: "ownership",   num: "5",  label: "Ejerkreds og funding",     status: "ok"    },
    { k: "financials",  num: "6",  label: "Finansiel udvikling",      status: "ok"    },
    { k: "budget",      num: "7",  label: "Budget vs realiseret",     status: "warn"  },
    { k: "kpi",         num: "8",  label: "Nøgletal",                 status: "ok"    },
    { k: "risk",        num: "9",  label: "Risici",                   status: "warn"  },
    { k: "security",    num: "10", label: "Sikkerheder",              status: "warn"  },
    { k: "open",        num: "11", label: "Manglende afklaringer",    status: "info"  },
    { k: "rec",         num: "12", label: "Anbefaling",               status: "draft" },
    { k: "appendix",    num: "13", label: "Bilagsliste",              status: "ok"    },
  ];

  function scrollTo(key) {
    setActive(key);
    const el = document.getElementById('ms-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const sources = MEMO_SOURCES[active] || [];

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
                <span className="mono" style={{ fontSize: 10, color: 'var(--c-text-4)' }}>{s.num}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Document ── */}
        <div className="card" style={{ background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar */}
          <div className="card-head" style={{ flexShrink: 0, borderBottom: '1px solid var(--c-line-2)' }}>
            <div>
              <div className="card-title">Credit memo · udkast</div>
              <div className="card-sub">Sidst opdateret 24. maj 09:14 · klik i teksten for at redigere</div>
            </div>
            <div className="hstack">
              <button className="btn btn-sm btn-ghost"><I.Download className="ic"/> PDF</button>
            </div>
          </div>

          {/* Toolbar */}
          <MemoToolbar focusedKey={focusedKey} citeOpen={citeOpen} onOpenCitePicker={openCitePicker} onReset={resetSection}/>

          {/* Scrollable doc body */}
          <div
            ref={scrollRef}
            style={{ padding: '36px 56px 60px', maxHeight: 660, overflowY: 'auto' }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onInput={handleScrollInput}
          >
            {/* Doc header (non-editable) */}
            <div style={{ borderBottom: '2px solid var(--c-ink)', paddingBottom: 14, marginBottom: 30 }}>
              <div className="label-mini" style={{ marginBottom: 4 }}>Kreditindstilling</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>Nordhavn Composite A/S</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 4, display: 'flex', gap: 14 }}>
                <span className="mono">CVR 38 42 71 56</span>
                <span>Sagsnr. 2026-0184</span>
                <span>Udarbejdet af Mette Larsen</span>
                <span>24. maj 2026</span>
              </div>
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
              />
            ))}
          </div>
        </div>

        {/* ── Sources ── */}
        <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div className="card-title">Kilder & provenance</div>
          </div>
          <div style={{ padding: '8px 14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '6px 0 6px' }}>
              <div className="label-mini">{modifiedSections[active] ? 'Kilde + manuelt input' : 'Brugt i nuværende afsnit'}</div>
              {modifiedSections[active] && (
                <span style={{ fontSize: 10, background: 'rgba(176,111,23,0.1)', color: 'var(--c-warn)', border: '1px solid rgba(176,111,23,0.25)', borderRadius: 4, padding: '1px 6px' }}>Redigeret</span>
              )}
            </div>
            {sources.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--c-text-3)', padding: '6px 0 4px' }}>Ingen automatiske kilder -skrives manuelt.</div>
              : sources.map((s, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < sources.length - 1 ? '1px solid var(--c-line-2)' : 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{s.t}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{s.p}</div>
                </div>
              ))
            }
            <div className="label-mini" style={{ margin: '16px 0 6px' }}>Provenance</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-2)', lineHeight: 1.6 }}>
              Hold musen over <span style={{ borderBottom: '1.5px dotted var(--c-primary)', color: 'var(--c-ink)', cursor: 'help' }}>understregede tal og tekst</span> for at se præcis hvilken side eller linje de stammer fra.
            </div>
          </div>
        </div>

      </div>

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
