// Credit memo: sproget (fast pr. sideindlæsning), skabelonens tekst pr. afsnit på dansk og engelsk
// (EIFO "Kreditindstilling"), kilderne pr. afsnit, afsnittene og rådgiveren. Flyttet ordret fra
// src/memo.jsx (linje 364-1938) ved migrationen til Vue; kun export-linjen er ny.
// MEMO_EN læses af window.CW_LANG, når modulet indlæses (src/bootstrap.js indlæser i18n først), og på
// engelsk flettes SEC_EN ind i SEC her, før memoReview.js regner seed-versionen ud af SEC.
// Skabelonteksterne må ikke omformateres: hvert tegn indgår i seed-versionen (memo4-seed-version) og
// i gennemgangenes fingeraftryk. En ændring rydder gemte udkast og viser gennemgange som ændrede.

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
        <li>2021-2025: Nettoomsætningen er vokset fra DKK 19,4 mio. til <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9">DKK 41,1 mio.</span>, og EBITDA fra DKK 0,6 mio. til 2,4 mio.</li>
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
        <li><strong>Økonomisk levedygtighed:</strong> Nettoomsætningen er steget til <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41,1 mio. i 2025</span>, men indtjeningsevnen er tynd: EBITDA-marginen er <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8 %</span> og uændret fra 2024. Gæld/EBITDA på <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3,3×</span> er højt for en virksomhed af denne størrelse; budgettet for 2026 forventer 3,0. Gældsserviceringsevnen er tilstrækkelig i basisscenariet, men følsom over for betalingstidspunktet fra GE Vernova og USD-kursen (afsnit 10).</li>
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
    <em class="tpl-hint">Analyser de væsentligste forhold vedrørende bestyrelse/Advisory Board, f.eks.:</em>
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
    <em class="tpl-hint">Analyser produktrisikoen, f.eks.:</em>
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
      <p>Selskabet producerer strukturelle kompositkomponenter til vindmøllevinger: bjælkepakker og pultruderede kulfiberlameller, rodmoduler og rodindsatser, næsekanter og lukkeprofiler samt service, reparation og reservedele. Omsætningen i 2025 fordelte sig på de fire områder med <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6">DKK 22,6, 10,3, 5,3 og 2,9 mio.</span>, beregnet til 55 %, 25 %, 13 % og 7 % af omsætningen. Hele omsætningen ligger i vindindustrien; marine- og forsvarsindustrien er et mål for diversificering. Produkterne er teknologisk krævende med betydelig procesviden, og produktionen er ordrebaseret. Selskabet ejer selv produktionsværktøjet til de fleste programmer, mens projektværktøjet til Block Island overgår til GE Vernova. Aktiverede udviklingsprojekter på DKK 0,6 mio. (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">balancen</span>) ejes af selskabet, men er ikke omfattet af virksomhedspantet, der alene omfatter debitorer (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S3">S3</span>).</p>
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
    <em class="tpl-hint">Kort analyse af risikoen i de markeder virksomheden opererer på, f.eks.:</em>
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
          <tr><td>EBITDA-margin (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8 %</span></td><td style="text-align:right;font-family:monospace">6,4 %</td></tr>
          <tr><td>Top-3 kunders andel af omsætningen (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">56 %</span></td><td style="text-align:right;font-family:monospace">61 %</td></tr>
          <tr><td>Materialeforbrug i % af omsætningen (vægtet gennemsnit)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="note 18">55,0 %</span></td><td style="text-align:right;font-family:monospace">55 %</td></tr>
          <tr><td>Debitordage (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 7">23</span></td><td style="text-align:right;font-family:monospace">67</td></tr>
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
    <em class="tpl-hint">Revisionsform, regnskaber revideret eller udvidet gennemgang? Revisortype, f.eks. statsautoriseret eller registreret revisor. Er der forbehold / revisionsanmærkninger? Hvem har udarbejdet perioderegnskab, budgetmateriale, følsomhedsanalyse og evt. koncernsammenstilling?</em>
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
          <tr><td>Nettoomsætning</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2023">28,0</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2024">32,8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41,1</span></td></tr>
          <tr><td>Bruttofortjeneste</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2023">12,8</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2024">15,2</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2025">18,5</span></td></tr>
          <tr><td>EBITDA</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 6" data-line="EBITDA" data-col="2023">1,3</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 6" data-line="EBITDA" data-col="2024">1,9</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 6" data-line="EBITDA" data-col="2025">2,4</span></td></tr>
          <tr><td>Egenkapital</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2023.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2023">3,5</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2024">4,8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8" data-line="Egenkapital" data-col="2025">6,2</span></td></tr>
        </tbody>
      </table>
      <p>Trend: nettoomsætningen er vokset 47 % på to år, men indtjeningen følger ikke med. Bruttomarginen er faldet fra 46,3 % i 2024 til 45,0 % i 2025 på grund af stigende kulfiber- og harpikspriser, og EBITDA-marginen ligger fladt på 5,8 % i både 2024 og 2025. Væksten i 2025 kom fra helårseffekten af rodmodulprogrammet for Vestas, øget salg til Siemens Gamesa og nye kunder, mens leverancerne til GE Vernova faldt (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 4">ledelsesberetningen</span>). Resultatet ligger inden for ledelsens udmeldte forventninger (omsætning DKK 39-42 mio., EBITDA DKK 2,2-2,6 mio.). Ingen ekstraordinære poster. Egenkapitalen steg i 2024 fra 3,5 til 4,8 mio. med årets resultat på 0,7 mio. og en rettet kontant kapitalforhøjelse på 0,6 mio. (<span class="memo-cite" data-doc="Aarsrapport_2024.pdf" data-page="s. 8">årsrapport 2024, note 11</span>), og i 2025 til 6,2 mio. med resultat 1,0 mio. og en kapitalforhøjelse på 0,4 mio.</p>
    </div>

    <p><strong>Budget 12-2026</strong></p>
    <ul class="tpl-hints">
      <li>Anfør væsentligste budgetforudsætninger</li>
      <li>Analyser realismen i væsentlige spring i omsætning, DG og EBITDA margin mv, f.eks. ordrebeholdning og pipeline.</li>
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
      <p>Aktiverne vurderes realistisk værdiansat. Omsætning indregnes ved levering og risikoovergang, og der er ikke indregnet omsætning efter produktionsmetoden (<span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6">note 1</span>). Igangværende arbejder er ifølge periodetallene <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Balance">værdiansat til medgåede omkostninger uden avance</span>. Tilgodehavender fra salg på DKK 2,55 mio. er koncentrerede, idet de tre største kunder udgør 78 % pr. balancedagen, men modparterne er store, børsnoterede eller statsligt understøttede industrikoncerner, og debitordagene er 23 (<span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 7">note 8</span>). Ejendommen er finansieret med et 20-årigt realkreditlån, maskinerne med anlægslån og leasing (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">note 10</span>); realkreditlånet fremgår ikke af bankens prioritetsoversigt, jf. afsnit 5. Likviditetsgrad 250 %. Soliditet 44,3 %; anpartshaverlånet på DKK 0,5 mio. er ikke efterstillet og kan ikke regnes som ansvarlig kapital, før tilbagetrædelseserklæring foreligger. Gæld i alt/EBITDA 3,3 og nettorentebærende gæld/EBITDA 1,5 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">nøgletal</span>). Eventualforpligtelser: lejeforpligtelser på DKK 1,98 mio., sædvanlige produktgarantier og en opfyldelsesgaranti over for GE Vernova på USD 207.500. Mellemregninger: kapitalejerlånet til direktøren er indfriet, og der er intet mellemværende med ledelsen ultimo 2025.</p>
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
    <em class="tpl-hint">Lav en eller flere relevante følsomhedsanalyser, f.eks.:</em>
    <ul class="tpl-hints">
      <li>Low Case f.eks. med lavere vækstrater, lavere indtjeningsmarginaler og/eller opsigelse af kontrakter</li>
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
        <tr><td>Bruttomargin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2023">45,7 %</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2024">46,3 %</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2025">45,0 %</span></td></tr>
        <tr><td>EBITDA-margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2023">4,6 %</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2024">5,8 %</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5,8 %</span></td></tr>
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
          <td style="width:30%"><strong>Indstillingsniveau:</strong> <span class="tpl-blank">Kundechef</span> - <strong>Initial:</strong> <span class="tpl-blank">[initialer]</span></td>
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
          <td style="width:30%"><strong>Bevillingsinstans:</strong> <span class="tpl-blank">Kreditkomité</span> - <strong>Initial:</strong> <span class="tpl-blank">[initialer]</span></td>
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
      <li>Har virksomheden overfor leverandører tydeliggjort virksomhedens forventninger og minimumskrav for ansvarlig virksomhedsadfærd, f.eks. kontrakter, Code of Conduct eller lign.?</li>
      <li>Har virksomheden kortlagt kendte risici, som virksomheden eller leverandørkæden kan være forbundet til?</li>
      <li>Har virksomheden på baggrund af risikovurderingen igangsat konkrete initiativer mhp. at håndtere risici?</li>
      <li>Har virksomheden en klagemekanisme (whistleblowerordning) tilgængelig for sine interessenter til at indberette kritisable forhold i værdikæden?</li>
      <li>Benytter virksomheden auditprogrammer, f.eks. ISO 9001, ISO 14001, ISO 45001 eller lign.?</li>
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
        <li>2021-2025: Net revenue has grown from DKK 19.4 million to <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9">DKK 41.1 million</span>, and EBITDA from DKK 0.6 million to DKK 2.4 million.</li>
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
        <li><strong>Economic viability:</strong> Net revenue has risen to <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">DKK 41.1 million in 2025</span>, but earnings capacity is thin: the EBITDA margin is <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5.8%</span> and unchanged from 2024. Debt/EBITDA of <span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9" data-line="Gæld / EBITDA" data-col="2025">3.3×</span> is high for a company of this size; the 2026 budget expects 3.0. Debt service capacity is sufficient in the base case but sensitive to the timing of GE Vernova's payment and the USD rate (section 10).</li>
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
      <p>The company manufactures structural composite components for wind turbine blades: spar caps and pultruded carbon fibre laminates, root modules and root inserts, leading edges and closing profiles, and service, repair and spare parts. Revenue in 2025 was split across the four areas with <span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6">DKK 22.6, 10.3, 5.3 and 2.9 million</span>, calculated at 55%, 25%, 13% and 7% of revenue. All revenue comes from the wind industry; the marine and defence industries are a diversification target. The products are technologically demanding with substantial process knowledge, and production is to order. The company owns the production tooling for most programmes, while the project tooling for Block Island passes to GE Vernova. Capitalised development projects of DKK 0.6 million (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 7">balance sheet</span>) are owned by the company but are not covered by the floating charge, which covers receivables only (<span class="memo-cite" data-doc="Sikkerhedsdokumenter.pdf" data-page="S3">S3</span>).</p>
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
          <tr><td>EBITDA margin (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5.8%</span></td><td style="text-align:right;font-family:monospace">6.4%</td></tr>
          <tr><td>Top-3 customers' share of revenue (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="note 18">56%</span></td><td style="text-align:right;font-family:monospace">61%</td></tr>
          <tr><td>Materials in % of revenue (weighted average)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="note 18">55.0%</span></td><td style="text-align:right;font-family:monospace">55%</td></tr>
          <tr><td>Debtor days (median)</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 7">23</span></td><td style="text-align:right;font-family:monospace">67</td></tr>
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
          <tr><td>Revenue</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2023">28.0</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2024">32.8</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6" data-line="Nettoomsætning" data-col="2025">41.1</span></td></tr>
          <tr><td>Gross profit</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2023">12.8</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2024">15.2</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6" data-line="Bruttofortjeneste" data-col="2025">18.5</span></td></tr>
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
      <p>The assets are considered realistically valued. Revenue is recognised on delivery and transfer of risk, and no revenue is recognised under the percentage-of-completion method (<span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 6">note 1</span>). According to the interim figures, work in progress is <span class="memo-cite" data-doc="Periodetal_jan-aug_2026.xlsx" data-page="ark Balance">valued at costs incurred without profit</span>. Trade receivables of DKK 2.55 million are concentrated, as the three largest customers account for 78% at the balance sheet date, but the counterparties are large, listed or state-backed industrial groups, and debtor days are 23 (<span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 7">note 8</span>). The property is financed with a 20-year mortgage loan, the machinery with term loans and leasing (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 8">note 10</span>); the mortgage loan does not appear in the bank's ranking overview, cf. section 5. Current ratio 250%. Solvency 44.3%; the shareholder loan of DKK 0.5 million is not subordinated and cannot be counted as subordinated capital until a subordination declaration is in place. Total debt/EBITDA 3.3 and net interest-bearing debt/EBITDA 1.5 (<span class="memo-cite" data-doc="Aarsrapport_2025.pdf" data-page="s. 9">key figures</span>). Contingent liabilities: lease obligations of DKK 1.98 million, customary product warranties and a performance bond to GE Vernova of USD 207,500. Intercompany balances: the unlawful loan to the CEO has been repaid, and there was no balance with management at the end of 2025.</p>
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
        <tr><td>Gross margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2023">45.7%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2024">46.3%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="Bruttomargin %" data-col="2025">45.0%</span></td></tr>
        <tr><td>EBITDA margin</td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2023.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2023">4.6%</span></td><td style="text-align:right;font-family:monospace"><span class="memo-cite" data-doc="Intern_aarsrapport_2024.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2024">5.8%</span></td><td style="text-align:right;font-family:monospace;font-weight:600"><span class="memo-cite" data-doc="Intern_aarsrapport_2025.pdf" data-page="s. 9" data-line="EBITDA-margin %" data-col="2025">5.8%</span></td></tr>
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
          <td style="width:30%"><strong>Recommendation level:</strong> <span class="tpl-blank">Relationship manager</span> - <strong>Initials:</strong> <span class="tpl-blank">[initials]</span></td>
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
          <td style="width:30%"><strong>Approval authority:</strong> <span class="tpl-blank">Credit committee</span> - <strong>Initials:</strong> <span class="tpl-blank">[initials]</span></td>
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
/* Navne og sidehenvisninger her skal matche window.CASE_DOCS ordret. De interne årsrapporter
   (case_documents_public.js) har omsætning og vareforbrug, som de offentlige (§ 32) ikke viser. Listen
   styrer både kildepanelet og hvilke dokumenter AI'en får som grundlag for
   det enkelte afsnit. */
const MEMO_SOURCES = {
  background:  [{ t: "Intern_aarsrapport_2025.pdf", p: "s. 9 -Hoved- og nøgletal med omsætning" }, { t: "Aarsrapport_2025.pdf", p: "s. 2, s. 4 -Selskabsoplysninger og ledelsesberetning" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "s. 1 -projektoversigt" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 2 -bankens motiv" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197" }],
  financing:   [{ t: "Budget_2026-28_v3.xlsx", p: "linje 197 -finansieringsplan" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "§4 -betalingsbetingelser" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 1, s. 4, s. 5 -vilkår og tillæg" }, { t: "Sikkerhedsdokumenter.pdf", p: "S1-S5" }],
  rating:      [{ t: "Periodetal_jan-aug_2026.xlsx", p:"ark Kunder" }, { t: "Aarsrapport_2025.pdf", p: "s. 9 -Nøgletal" }, { t: "Bankansoegning_Nordjyske_Bank.pdf", p: "s. 3 -bankens rating" }, { t: "Ratingberegning_2026-0184.pdf", p: "s. 1, s. 2 -ratingberegning" }],
  legal:       [{ t: "GE_Vernova_rammekontrakt.pdf", p: "§11, §14" }, { t: "Aarsrapport_2025.pdf", p: "note 14 -Anpartshaverlån" }, { t: "Sikkerhedsdokumenter.pdf", p: "S5 -afventer underskrift" }],
  risk:        [{ t: "Periodetal_jan-aug_2026.xlsx", p:"ark Kunder, ark Ordrebog" }, { t: "Aarsrapport_2025.pdf", p: "note 18 -risici" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "§3, §7" }],
  conclusion:  [{ t: "Intern_aarsrapport_2025.pdf", p: "s. 6, s. 9 -omsætning og marginer" }, { t: "Aarsrapport_2025.pdf", p: "s. 6, s. 9" }, { t: "Budget_2026-28_v3.xlsx", p: "linje 197, ark Likviditet" }, { t: "Periodetal_jan-aug_2026.xlsx", p:"ark Resultat" }, { t: "Sikkerhedsdokumenter.pdf", p: "S5" }],
  ownership:   [{ t: "Ejerbog_2026.pdf", p: "s. 1, s. 3-4" }, { t: "Aarsrapport_2025.pdf", p: "note 14 -Anpartshaverlån" }, { t: "Sikkerhedsdokumenter.pdf", p: "S4 -personlig kaution" }],
  product:     [{ t: "Intern_aarsrapport_2025.pdf", p: "s. 6 -note 1 Nettoomsætning" }, { t: "Aarsrapport_2025.pdf", p: "s. 4 -Forretningsmodel" }, { t: "GE_Vernova_rammekontrakt.pdf", p: "s. 1, §2" }],
  market:      [{ t: "Intern_aarsrapport_2025.pdf", p: "s. 7, note 18 -debitordage og vareforbrug" }, { t: "Periodetal_jan-aug_2026.xlsx", p:"ark Kunder" }, { t: "Aarsrapport_2025.pdf", p: "s. 4 -Markedsforhold" }],
  financial:   [{ t: "Intern_aarsrapport_2025.pdf", p: "s. 6-9, Specifikationer -omsætning, vareforbrug og marginer" }, { t: "Intern_aarsrapport_2024.pdf", p: "s. 6-9" }, { t: "Intern_aarsrapport_2023.pdf", p: "s. 6-9" }, { t: "Aarsrapport_2025.pdf", p: "s. 6-9, s. 14 -Revisionspåtegning" }, { t: "Aarsrapport_2024.pdf", p: "s. 6-9" }, { t: "Aarsrapport_2023.pdf", p: "s. 6-9" }, { t: "Periodetal_jan-aug_2026.xlsx", p:"ark Resultat, ark Balance" }, { t: "Budget_2026-28_v3.xlsx", p: "ark Resultat, ark Likviditet" }],
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

// Modul-eksport
export { MEMO_EN, LANG_SUFFIX, SEC, SEC_EN, SEC_DA, MEMO_SOURCES, MEMO_SECTIONS, MEMO_REVIEWER };
