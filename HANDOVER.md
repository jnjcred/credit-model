# Overdragelse: credit memo-værktøjet

Skrevet 4. august 2026. Formålet er at en frisk session kan tage over uden at
Jesper skal forklare noget.

## Sådan startes det

```powershell
node "c:\Users\jnj\CrediWire ApS Dropbox\Product team\AI Agents\Hello world\credit-model\devserver.js"
```

Derefter <http://localhost:8080/>. Kan ikke åbnes som `file://`, fordi Babel
transpilerer `.jsx` i browseren.

**Tjek at det er den rigtige server.** En Python-server har taget port 8080 en
gang, og så virker filerne men AI-broen gør ikke:

```powershell
Invoke-RestMethod http://localhost:8080/local-ai/status
```

Skal svare med `claude.available: true` og `codex.available: true`.

## AI uden API-kredit

Et Claude- eller ChatGPT-abonnement giver ikke API-adgang. `devserver.js` kalder
derfor de lokale kommandolinjer, som logger ind med selve abonnementet:

- **Claude Code**: binæren ligger i VS Code-udvidelsen under
  `~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude.exe`.
  Streamer tokens. Kaldes med `-p --output-format stream-json --include-partial-messages`.
- **Codex CLI**: `codex.cmd` kan ikke spawnes fra Node siden 18.20, så der køres
  `node ~/AppData/Roaming/npm/node_modules/@openai/codex/bin/codex.js exec --json -`.
  Skriver login-status på **stderr**. Streamer ikke tokens, kun færdige beskeder.

Prototypen har fire valg i forbindelsesdialogen: Dit abonnement (lokalt), Claude
(API-nøgle), ChatGPT (API-nøgle) og Copilot. Microsoft 365 Copilot har intet
åbent API, så Copilot-fanen forbinder til bankens Azure OpenAI-ressource
(adresse, nøgle og udrulningsnavn) og bruger OpenAI-formatet på
`<ressource>/openai/v1/chat/completions` med headeren `api-key`.

**Vigtigt om `onDelta`**: streaming-laget skal kalde `onDelta(delta, samletTekst)`.
Sender man kun deltaet, står UI'et med en blinkende markør indtil svaret er
færdigt. Den fejl er lavet én gang; `drive_stream.js` fanger den nu.

## Test

Alle testsæt ligger i scratchpad og drives gennem en headless Chrome på port 9222.

```powershell
$dir = "C:\Users\jnj\AppData\Local\Temp\claude\c--Users-jnj-CrediWire-ApS-Dropbox-Product-team-AI-Agents-Hello-world\971d1953-292b-4775-af91-e1233a1436ea\scratchpad"
# Chrome skal køre først:
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--headless=new --no-sandbox --disable-gpu --remote-debugging-port=9222 --user-data-dir=`"$dir\p-undo`" about:blank"
foreach ($t in @("drive.js","drive_audit.js","drive_undo.js","drive_table.js","drive_source.js","drive_export.js")) { node "$dir\$t" }
```

| Fil | Dækker |
|---|---|
| `drive.js` | AI-generering mod mock-API, 38 kontroller |
| `drive_errors.js` | Fejlbeskeder: manglende kredit, hastighedsgrænse, forkert nøgle, ukendt model |
| `drive_stream.js` | At teksten vokser undervejs i stedet for at komme samlet |
| `drive_audit.js` | Kildekontrol og talafstemning |
| `drive_undo.js` | Fortryd, og at markering ikke lander i forkert afsnit |
| `drive_table.js` | Tabelredigering, Tab mellem celler, indsætning fra Excel |
| `drive_source.js` | Klikbare kildehenvisninger, memoets højde |
| `drive_export.js` | Word-eksport renset for skabelon, udkastmærker og interne noter |

**Nyere regressionspakke (29.-30. september).** Den samlede pakke ligger i
scratchpad for session `1b06246f-...` og kører alle suiter parallelt på en pulje
af headless Chrome-porte:
`node SP\regress\regress.js 9291,9292,9293,9294`. Generalprøven køres med
`CDP_PORT=9291 node SP\rehearsal\run\demo.js 1`. Luk de headless Chromes
bagefter (processer med `--remote-debugging-port`).

Hjælpeværktøjer: `shot.js <rute> <fil.png>` tager skærmbilleder,
`dumpmemo.js` skriver memoet ud som ren tekst, `check_cites.js` kontrollerer
kildehenvisninger mod dokumenterne, `mockapi.js` er en falsk udbyder på :8090.

## Hvad der blev lavet 4. august

Grundlaget var to agent-gennemgange: 79 agenter på brugervenlighed (72 fund, 63
verificeret) og 45 agenter på kreditfaget (40 fund, 16 verificeret). Hvert fund
blev efterprøvet af en skeptiker sat til at afvise i tvivlstilfælde.

Færdigt:

1. **Fortryd for AI-ændringer.** AI'en skriver med `innerHTML`, hvilket ikke
   lægger noget i browserens fortryd-stak, og `persist()` gemte med det samme.
   En times arbejde kunne forsvinde lydløst. Snapshots gemmes per afsnit under
   `memo4:snap:<sKey>`. Se `pushSnap`/`popSnap` i memo.jsx.
2. **Markeringen bliver i sit eget afsnit.** `_memoLastRange` var global og blev
   overskrevet af klik i andre afsnit, så AI-tekst kunne lande forkert uden
   fejlbesked. Markeringen fryses nu sammen med hvilket afsnit den kom fra, og
   indsættelse afvises hvis den ikke længere ligger der.
3. **Tabelredigering.** Rækker og kolonner ind og ud, Tab mellem celler.
   Kolonneoperationer rammer både `thead` og `tbody`, hvilket er nødvendigt fordi
   skabelonens tabeller har forskelligt antal celler i de to.
4. **Indsætning fra Excel og Word** bevarer struktur, renset gennem `cleanHtml`.
5. **Memoet fylder skærmen** i stedet for fast 660px.
6. **Klikbare kildehenvisninger.** Åbner dokumentet på den rigtige side og
   fremhæver den citerede passage. Siger ærligt til hvis teksten ikke kan findes.
7. **Word-eksport renset.** Skabelonvejledning og udkastmærker fjernes, interne
   kommentarer er nu et fravalgt tilvalg, uskrevne afsnit markeres i stedet for
   at eksportere rå skabelon, kildehenvisninger skrives ud som dokument og side.

Fra bankholdet, lavet tidligere samme dag:

- **Kildekontrol på hele memoet.** `unknownCitations` fandtes, men blev kun kaldt
  på AI-preview. 15 af 40 henvisninger pegede på syv dokumenter der ikke findes.
- **Talafstemning mod regnskabstabellen.** Memoet brugte bruttofortjeneste som
  omsætning, så indtjeningsevnen så dobbelt så god ud. Alle tre bankagenter
  fandt det uafhængigt af hinanden.
- **Rettede tal i skabelonens seed-tekst** fem steder.

## Hvad der blev lavet 29. september

Grundlag: UX-gennemgang med seks roller (rådgiver, komité, kundens
økonomichef, teamleder, interaktionsdesigner, tilgængelighed), 119 fund.
Rapporten er publiceret som artifact: https://claude.ai/artifact/RRCaQupkFKcmCdUk74TV5q
Rettet efter Jespers ramme: det er en demo, integrationer skal ikke virke, men
**rådgiveren skal kunne uploade dokumenter fra kunden, og flowet skal virke
derfra** (modtaget, godkendt, klar, memo, indstillet).

**Ny arkitektur: `src/case_state.js` (window.CW).** Én fælles tilstand for
Nordhavn-sagen: materialekataloget (med forklaring pr. punkt og hvad der allerede
ligger under Dokumenter), punkternes tilstand (modtaget, godkendt, afvist, filer,
noter), rigtige filer som objectURL i hukommelsen, anmodningen med frist,
spørgsmål mellem kunde og rådgiver, sagens fase (`CW.caseState()`), `CW.toast`,
`CW.notInDemo` og `CW.useDialog`. Sagshovedet, Overblik, Kundeside, kundeportalen,
Dokumenter, Dataanmodninger og Mine opgaver læser alle herfra. (Fra 30. september
er demoen vedvarende; se næste afsnit.)

Det vigtigste der er ændret:
- **Sagsflowet** (workspace.jsx): fasen huskes, statuspillen følger den, én
  "næste skridt"-knap i hovedet, afslag kræver årsag, klarhedstjek før indstilling
  (materiale og `CW_MEMO_STATUS()`), indstillingen overlever fanebyt og kan trækkes
  tilbage. "Udestående fra kunden" har godkend/afvis pr. punkt og "Upload for
  kunden". Sagen går selv til Klar når alt er godkendt. Dialog med kunden på
  Overblik. Andre sager end Nordhavn viser en tom tilstand. Status-knappen
  (Nicholas' ønske) viser udestående uden at ændre fasen.
- **Kunden** (customer_status.jsx, new_case_portal.jsx): rigtig filupload,
  "Har vi ikke", afkrydsning og fortryd, portal og statusside er enige, e-conomic
  uden adgangskodefelt og med tidsbegrænset samtykke, portalen virker på telefon.
  Ny sag-guiden validerer og advarer om dubletter.
- **Memoet** (memo.jsx, memo_ai.jsx): "Kontrollér" er fjernet. Kildeviseren er
  kun grøn ved ordret match. Word-eksporten svarer til skærmen og markerer
  ugennemgåede udkast. "Markér som gennemgået" pr. afsnit; procent og prikker
  beregnes. Tab-fælden er væk. Memoet låses efter indstilling. Seed-teksten er
  rettet mod kilderne (37 rettelser: ejere, anpartshaverlån, revisor og § 210,
  bestyrelse, facilitet 4,5 mio. med 80 % EIFO-kaution, løbetid 30 mdr., pari
  passu, finansieringsplan). Ny seed slår selv igennem via `MEMO_SEED_VERSION`
  plus en hash; afsnit rådgiveren har rettet bevares.
- **Data og navigation** (data.js m.fl.): `DATA.COMPANY` følger årsrapport og
  ejerbog (Nordhavn Composite A/S, Havnegade 42, stiftet 2014, kontakt Susanne
  Pedersen, økonomichef). "Dataanmodninger" i menuen, beregnede tal, sagskort
  som knapper med frist og næste skridt, Porteføljeanalyse med nettoomsætning,
  kontrasten i `--c-text-3` og `--c-text-4` hævet til AA.

Beslutninger undervejs:
- **Budgetafvigelsen (primo 4,2 mod 6,2 mio.) er fjernet.** Kilden har 6,20 i
  begge. Revisors supplerende oplysning om ulovligt kapitalejerlån (§ 210) er nu
  sagens røde flag.
- Forvalgt materiale er kun det der mangler eller er forældet (intern årsrapport,
  periodetal, salg pr. land). Resten viser "Findes allerede".

Test af hele demohistorien: `scratchpad\fix\final\demo_e2e.js`
(`CDP_PORT=<port> node demo_e2e.js da|en`), 41 kontroller pr. sprog. Hver
agents egen testpakke ligger i `scratchpad\fix\<område>\`. Scratchpad for
sessionen: `C:\Users\jnj\AppData\Local\Temp\claude\c--Users-jnj-CrediWire-ApS-Dropbox-Product-team-AI-Agents-Hello-world-credit-model\1b06246f-b52e-4853-b0b4-7ed55c01e1d4\scratchpad`.
Oversættelser: rediger `src/i18n_dict_*.js` og genopbyg bundtet med
`scratchpad\rebuild_i18n.py <repo>`.

**Crediwires egne eksporter (1. oktober).** Dokumenter har gruppen "Eksport fra
Crediwire" med fem filer, som rådgiveren kan tage med over i Copilot og skrive
memoet i Word ud fra: `Regnskabstabel_Nordhavn.xlsx` (ark Regnskab, Kvartaler,
Noter), `Produkt_marked_og_branche.pdf`, `Trustpilot.pdf`,
`Ejerskab_og_finansielle_bindinger.pdf` og `Virksomhedsprofil_CVR.pdf`. De står
i `window.CW_EXPORT_DOCS` nederst i `financials.jsx` og bygges, når de hentes,
af de samme tal og tekster som Finansielt overblik (også budgetrettelser).
Tabellen og eksporten deler `finRawValue`/`finEntryVal`. Eksporterne ligger
bevidst ikke i `CASE_DOCS`, så memo-AI'en, bilagslisten og kildevælgeren kun
bruger kildedokumenterne (`origin: 'export'` filtreres fra i `memo.jsx`).
`docRegistry` (data.js) udelader en eksport, der fejler, med en console.warn.

**Credit memo i piloten (2. oktober).** EIFO skriver memoet i Word med Copilot
uden for Crediwire. Flaget `window.CW_MEMO_MODE` (case_facts.js, localStorage
`cw_memo_mode`, standard `copilot`) styrer det:
- `copilot`: Credit memo-fanen er `src/memo_handoff.jsx`. Den viser "Hent alle N
  dokumenter" (kundens og bankens filer, offentlige data og Crediwires
  eksporter), tre trin til at fortsætte i Copilot og listen med markering af,
  hvad der er hentet (`caseState.handoff = { at, keys }`). Indstilling er
  skjult; ruten `:indstil` viser Credit memo, `wsSubmitReady()` er altid falsk,
  pillen står på "Memo skrives", og fasekortet, sagslistens næste skridt og
  hjælpen peger på Copilot.
- `builtin`: det indbyggede memo og Indstilling som før (memo.jsx og WSIndstil
  er uændrede). Slås til i Tweaks → Demo → "Indbygget memo og indstilling".
  Nulstil demo ændrer ikke flaget.
Backup af hele projektet før ændringen: `..\credit-model_backup_2026-10-02_credit-memo`.

**Kortet "Virksomhed og facilitet" er delt (2. oktober).** Produkt og beløb
("Eksportkaution, DKK 3,6 mio."; andelen af bankens facilitet i title) står
først i sagshovedets grå linje på alle faner (`facility` i WorkspaceShell).
Stamdata (CVR med kopiknap, juridisk form, branche, stiftet, ansatte, adresse
med kopiknap, Åbn i CVR) er sektionen "Virksomheden" i Finansielt overblik lige
før Ejerskab (`CompanySection` i financials.jsx). `StamoplysningerCard` er
fjernet, så Overblik starter med fasekortet.

**Kundeportalens oversigt (2. oktober, PortalHub i new_case_portal.jsx).**
Tilbage efter Jespers ønske: kortene "Det mangler vi" (PortalNeedCard) og
"Jeres kontakt" (PortalContactCard) og dialogen som et altid synligt chat-kort
(CWDialogCard, ikke i en fold). Sagslinjen (sagsnr. · produkt og beløb ·
ansvarlig) står i portalens topbjælke efter firmanavnet (portalCaseMeta, kun når
kunden er bekræftet); "Status for jeres ansøgning" er kun en skjult h1.
Behandlingsstatus er en egen boks under de to kort med tre trin (PortalSteps:
Materiale, EIFO vurderer sagen, Afgørelse senest …) bygget på csTimeline. "Kreditindstilling"
vises ikke for kunden. "Ligger allerede hos EIFO" tæller årsrapporterne fra
DATA.DOCS. "Det har vi bedt om"-listen og demoknappen fillAll er uændrede.
Den store tidslinje (CWTimeline) bruges stadig på statussiden efter "Vi er færdige".

**Kundeside og Kundeflow (5. oktober).** Rådgiverens forhåndsvisning har to spor
(sagshovedets knapper, WSCustomerPreview i workspace.jsx → CustomerPortal med
`flow`):
- **Kundeside** åbner altid på kundens oversigt uden skærmrækken. Har kunden ikke
  gjort opstarten færdig, står PortalPvObStatus øverst: "Kunden er ikke færdig
  med opstarten: trin n af 6, …", pvCustomerWhere(), trinene som en kort række og
  knappen "Se trinnet i Kundeflow", der skifter til Kundeflow på kundens trin.
- **Kundeflow** (demo) er gennemgangen af kundens skærme fra "Opret bruger" med
  skærmrækken (PV_SCREENS) og forrige/næste under kortet. Den mørke bjælke siger
  "Kundeflow (demo)".
Test: `scratchpad\tracks_test.js` i session 746e68ca (13 kontroller pr. sprog).
Test: `scratchpad\handoff_test.js` i session 746e68ca (`CDP_PORT=… BASE=… node handoff_test.js da|en`, 21 kontroller).

**Udestående og Materiale på sagen er delt (2. oktober, workspace.jsx).**
Overblik har nu: fasekort, "Udestående", "Dialog med kunden", "Materiale på
sagen" og "Seneste aktivitet".
- `WSOutstandingCard` (`#ws-outstanding`) er det, der kræver handling. Det
  har grupperne "Til gennemgang (n)" med "Godkend alle med fil" og "Afventer
  kunden (n)", hvor afviste og videresendte punkter også står. Kortet vises kun,
  når kunden er bedt om materiale. Står der intet udestående, er der én linje.
- `WSMaterialCard` (`#ws-received`) er det, sagen har: offentlige data og det
  godkendte fra kunden. Det, der ikke længere er påkrævet, står gråt nederst.
- Hvor et punkt står, afgøres af `wsItemPlace()`. Godkend flytter punktet ned,
  og beskeden siger "flyttet til Materiale på sagen". Fortryd flytter det op.
- Rækker, der afventer kunden, viser "Anmodet {dato} · frist {dato}", fordi
  gruppen allerede hedder Afventer kunden.
- `CustomerStatusBlock` er fjernet. `wsScrollTo('ws-outstanding')` falder
  tilbage til `#ws-received`, når der ikke er nogen anmodning.

Backup før ændringen: `..\credit-model_backup_2026-10-02_foer-udestaaende`
(src, index.html, styles.css, tokens.css, HANDOVER.md). Test:
`outstanding_test.js` (21 kontroller pr. sprog) og `edge_test.js` (afvist,
fravalgt, valgfrit) i session d1d0f86c's scratchpad. Den gamle `demo_e2e.js`
fra 30. sep. er forældet: den leder efter stamdata på Overblik og knappen
"Indhent mere materiale".

## Hvad der blev lavet 29.-30. september (runde 3-5)

Arbejdsgang: seks testroller (rådgiver, komité, kundens økonomichef, teamleder,
interaktion, tilgængelighed) gennemgik prototypen, alle fund kom i et register
med alvor, ejer og status, fem rettebølger med agenter pr. filområde, og efter
hver bølge en fælles regressionspakke og to slop-tests. Til sidst efterprøvede
de samme roller deres egne fund, og alle seks sagde "Tilfreds for demoen: JA".
Derefter en blind runde med otte nye roller uden kendskab til tidligere fund og
en generalprøve af demostien to gange i træk (se nederst i afsnittet).

**Demoen er nu vedvarende.** Tilstanden overlever genindlæsning og sprogskift
(localStorage-nøgler `kabul:*`, filer i IndexedDB `cw-demo-files`). Nulstil kun
med "Nulstil demo" nederst i sidebjælken (`CW.resetDemo()`).

**Nye filer:**
- `src/case_facts.js` (`window.CASE_FACTS`): det strukturerede faktaark
  (ansøgning, facilitet, betingelser, covenants, nøgledatoer, røde flag,
  nøgletal, uoverensstemmelser, rating), hver med kilde. Punkt 13 fra august.
- `src/case_documents.js` (`window.CASE_DOCS`): de kildedokumenter memoet
  citerer. Dokumentregistret bygges herfra, så alle citerede filer findes under
  Dokumenter. Kilderne er gjort indbyrdes konsistente.
- `src/i18n_dict_customer.js`.

**Det vigtigste der er ændret:**
- **Faser** går kun gennem `CW.requestStage()`, som spørger ved indstillede og
  afslåede sager. Klar afhænger kun af påkrævede punkter. En tilføjelse til en
  sendt anmodning er en visning, ikke en fase. Afslag kan gives i alle faser før
  indstilling og lukker kundens e-conomic-adgang.
- **Klarhedstjekket** (fanen Indstilling) er en rigtig port: alle afsnit
  gennemgået, Compliance' blokerende kommentar frigivet (kun af Compliance; i
  demoen "Simulér svar fra Jonas Holm"), begrundelse for tomme sagsfelter (2 i
  demoen) og én fælles for skabelonfelter. Komitéens felter tæller ikke med.
  Dybdelinks fører til afsnit, felt eller kommentar.
- **Indstilling** gemmer en frossen version med forside og gennemgangsstatus.
  Versioner kan åbnes og sammenlignes fra Sagens historik. Word-eksporten er
  stemplet og ensproget. Tilbagetrækning kræver årsag og forudfylder
  begrundelserne igen.
- **Memoet:** indstillingsboks på side 1 (punkt 14), gennemgang pr. afsnit
  uafhængigt af sprog (punkt 18) og nulstillet ved senere redigering.
  Kildeviseren kræver sammenhæng (år, måned, nægtelser, antal) for grønt og
  viser "Kontrollér sammenhængen" eller "Kilden siger det modsatte" ellers.
  `window.CW_CITE_ISSUES()` giver ubekræftede og modsagte henvisninger.
- **Kunden:** portalen respekterer afslag og indstilling, e-conomic har et
  demo-login og samtykketrin med hentning og kvittering, "Sig til Mette, at I er
  færdige" i stedet for "Indsend", kun brugsvilkår (ingen databehandleraftale).
  Kundeside i sagen er en forhåndsvisning, hvor handlinger logges som
  rådgiveren; "kunden sender"-øjeblikket vises via portalruten med engangskode.
- **Team og overblik:** fælles status (`DATA.caseStatusKey`), dage i fase og SLA
  (`DATA.caseAge`, gul fra 8 hverdage), omfordeling, "Afventer mig", lukkede
  anmodninger, huskede visninger, klokke med relativ tid. Punkt 16.
- **Ny sag-guiden** opretter en separat demosag med gemt anmodning og
  produktafhængig materialepakke. Punkt 17.
- **Tilgængelighed:** tastatur i hele kerneflowet, kildehenvisningers navne
  starter med den synlige tekst, 200 % zoom (media queries under 1100 px),
  fokus ved sideskift, 0 reelle kontrastfejl.

Beslutninger (fuld liste i registret, se nedenfor):
- Demoen fortælles som Mette. Ingen teamlederrolle.
- Typografien (små skrifter) er bevidst ikke ændret: designet er vist for kunder.
- Ændringer for smalle skærme må ikke ændre noget ved 1100 px og derover.
- Nordhavns standardanmodning er låneaftaler, landefordeling og valutapolitik;
  intern årsrapport findes allerede.

**Test.** Scratchpad for sessionen (`SP`):
`C:\Users\jnj\AppData\Local\Temp\claude\c--Users-jnj-CrediWire-ApS-Dropbox-Product-team-AI-Agents-Hello-world-credit-model\1b06246f-b52e-4853-b0b4-7ed55c01e1d4\scratchpad`
- Fælles regressionspakke: `node SP\regress\regress.js 9233,9271,...` (en
  kommasepareret liste af Chrome-porte). Kører røgtest, sagsflow, kundeportal,
  memo, team, dokumenter og alle `regress\inv_*.js`-invarianter parallelt plus
  faktatjek, tekst-slop og i18n.
- Slop-tests: `node SP\slop_text.js <repo>` og impeccable-detektoren
  (`detect.mjs --json src styles.css tokens.css`). Begge skal give 0.
- Fundregistret med beslutningslog: `SP\ledger\ledger.md`. Rapporterne:
  `SP\ledger\reports\` (runde 3), `SP\ux4v\` (verifikation), `SP\blind\`
  (blind runde), `SP\rehearsal\` (generalprøve).

**Blind runde og generalprøve (30. september).** Otte nye roller uden
kendskab til tidligere fund: nyansat rådgiver, erfaren rådgiver, komitémedlem,
kundens økonomidirektør, teamleder, QA, tilgængelighed og produktdesigner. To
sagde JA (erfaren rådgiver, tilgængelighed); seks sagde NEJ med i alt ni
objektive Kritisk/Høj-fund, som alle er rettet bagefter:
- dobbeltklik på Indstil gav to versioner, dobbeltklik på Færdig dublerede filer
- kunden kunne levere på en netop afslået sag
- et forkert rettet tal blev kun fanget ved klik (nu markeret i teksten, i
  Word og krævet begrundet i klarhedstjekket)
- Word-eksporten manglede kvittering og indstillingspåtegning
- kommentarer kunne lukkes efter indstilling (nu frosset og låst)
- klik i en skabelonpladsholder skrev ind i klammerne
- modtaget materiale kom ikke med i memoets bilagsliste (nu banner og knap)
- ny sag blev ikke vist i Porteføljeanalyse
- landeskemaet i portalen mistede indtastninger (nu kladder)
De rettede fund er ikke efterprøvet af de blinde roller igen.

Generalprøven kørte demostien (nulstil, vurdering, anmodning, kunden i
portalen, gennemgang, memo med Compliance og sprogskift, indstilling, Word,
afslutning) to gange i træk: alle 31 trin bestod begge gange, ca. 80 sekunders
klik, 11-13 minutter med forklaring. Script: `SP\rehearsal\run\demo.js`.
Præsentator-noter: den rigtige kundeportal (med engangskode) nås via ruten
`portal` eller Tweaks, "Kundeside" i sagen er en forhåndsvisning; sprogskift
genindlæser siden (ca. 6 s); åbn siderne én gang før demoen (Babel i browseren
gør første indlæsning langsom).

**Åbne beslutninger for Jesper:**
1. "Forbind AI" beder rådgiveren om en personlig Anthropic-nøgle. Designeren
   vurderede det som Høj for en statslig kunde og foreslår at vise "AI via
   EIFO's aftale · forbundet" med nøgle og model under "Avanceret". Ikke ændret.
2. e-conomic-login vises som en dialog på crediwire.app med adgangskodefelt.
   Kundens økonomidirektør mente, det ligner phishing, og foreslår et separat
   "vindue" med e-conomics adresse eller at springe login over. Ikke ændret.
3. Brugsvilkår og privatlivspolitik kan ikke åbnes i demoen.

**Flere filer pr. punkt (30. september, aften).** Et punkt kan have flere filer,
fx budget for i år og næste år, og der kan altid lægges flere til:
- Anmodningsmodalen: efter "Upload for kunden" står filerne hver for sig med
  "Fjern", og knappen bliver til "Tilføj fil". Filer kan trækkes ind på en
  række, også når den har filer ("Fjern alle" ved flere filer).
- Udestående: "Tilføj fil" står ved Godkend/Afvis og på et godkendt punkt, hvor
  nye filer sender punktet tilbage til gennemgang. Kundens egne filer bevares og
  kan ikke fjernes af rådgiveren; rådgiverens egne har "Fjern". Filer kan
  trækkes ind på punktet.
- Kundeportalen: et sendt punkt har en synlig "Tilføj fil" (før lå det kun i
  "..."-menuen), og nye filer lægges til de sendte.
Test med rigtige klik og browserens filvælger (tjekker, at den tillader flere
filer): `SP\final\multi.js` (29 kontroller).

## Hvad der blev lavet 30. september (designoprydningen)

"Anmod om materiale"-modalen blev målestokken for hele appen. En gennemgang gav
82 forslag, der står med status, før/efter og noter på designsiden:
https://claude.ai/artifact/V5feYc8uZnMai7bFA9eXcL. Forslagene er lavet, med
disse undtagelser: T5 og K7 er kun delvist gjort, og M15 er ikke gjort (se
nedenfor). Seks regler: én titel og én sætning, stille rækker, det sekundære i
en fold med antal, én primærknap, fokuserede opgaver i en modal, og kort dansk
uden versaler, farvede piller, ikonfelter og AI-pynt.

**Backup før ændringerne:** `..\credit-model_backup_2026-09-30_foer-design`. Start
den med `PORT=8088 node devserver.js` i mappen, og sammenlign med 8087.

**Fælles byggeklodser:** `src/ui_kit.jsx` (CWFold, CWSeg, CWStatus) og klasserne
`.cw-row`, `.cw-row-title/-meta/-cat`, `.btn-ghost-sm`, `.cw-fold`, `.cw-seg`,
`.cw-tabs`, `.cw-status` og `.cw-filelink` nederst i styles.css. Brug dem til nye
skærme. Versal-klasserne (`.label-mini`, `.kpi-lbl` m.fl.) er nu almindelig
tekst, og alle `.pill`-varianter er grå tekst med en farvet prik.

**Slettet (død kode):** findings_market.jsx, ownership_questions.jsx,
collection.jsx, en række ubrugte komponenter i workspace/financials/memo og ca.
3.000 tegn CSS. Alt findes i git og i backuppen.

**Verifikation:**
- Tre uafhængige reviewere (rådgiverens demosti, kundeportal og Ny sag, design
  på tværs) fandt ingen kritiske fejl. Deres høje fund er rettet: fokustab i
  dialogen efter svar, svage ghost-knapper, usynlig "Markér som gennemgået",
  forkerte tal på Indstilling og noten der forsvandt ved tilbagetrækning.
- Designreviewet gav "ligner AI" 7 før og 2 efter og "nem at bruge" 5 før og
  7,5 efter.
- Generalprøven (`SP\rehearsal\run\demo.js`) er skrevet om til den nye
  brugerflade og består 31/31 trin.

**Afvigelser fra forslagene (bevidste):**
- "Giv afslag" står også som ghost i vurderingsfasen, så nej-vejen er synlig.
- "Markér som gennemgået" er en sekundærknap, ikke ghost.
- Velkomsten i portalen tæller kun de påkrævede punkter, så tallet passer med
  oversigten.
- Større idéer er ikke lavet: at fjerne materialevalget fra Ny sag, at fjerne
  statussiden og at gøre Indstilling til en dialog.

**Præsentator-noter (nye knapnavne og placeringer):**
- "Nulstil demo" og DA/EN står nederst i sidebjælken (også i brugermenuen).
  Siden Indstillinger er fjernet.
- Vurdering: der er intet kildepanel. Folden "Offentlige data (3)" → "Gå til" ved
  en årsrapport åbner Dokumenter. Tallene står under Finansielt overblik.
- Anmod om materiale er en modal: "Næste" viser mailen, og "Rediger" ændrer
  modtager og frist. Knappen hedder "Send til Susanne". "Kassér ændringer" ligger
  i modalen.
- Portalen: route `portal`. Engangskoden 482913 er afløst af opret bruger/log ind
  og kundens opstart (se "Kundens opstart i portalen (2. oktober)"). "Spring
  opstarten over (demo)" nederst til højre springer hele opstarten over.
  Velkomsten har "Kom i gang". Beskeder står i folden "Beskeder med Mette". Kunden afslutter
  med "Vi er færdige".
- Memo: kommentarerne ligger bag fanen "Kommentarer" i højre kant. Word-eksport
  er "Eksportér til Word" → "Hent filen".
- Indstilling: knappen "Indstil til kreditkomité" står nederst på fanen.
  Kvitteringen hedder "Sagen er indstillet". En indstillet sag står under "Alle
  sager" → "Indstillet".
- Skift ikke sprog midt i demoen. Aktivitetslinjer gemmes på det sprog, de
  blev skrevet på (punkt 21).

**Rettet 1. oktober efter Jespers gennemsyn:**
- Lukkes "Anmod om materiale" uden at sende, står sagen igen på "Offentlige
  data er hentet". Mellemtrinnet "Anmodningen er ikke sendt" bruges ikke
  længere. Kladden er gemt og åbnes igen med "Anmod om materiale".
- Overblik: overskriften "Udestående fra kunden" og sætningen under den er
  fjernet. Kortets grupper ("Afventer kunden (2)", "Til din gennemgang") er
  overskrifterne. En skjult H2 er bevaret til skærmlæsere og fokus.
- Dokumenter står i samme emner som anmodningen: Regnskab og budget, Gæld og
  sikkerheder, Marked og drift, Ejere og selskab, Ansøgning og rating samt
  Øvrigt. Kilden (CVR, e-conomic, Kundeupload osv.) står i rækkens grå linje.
- Generalprøven er gjort uafhængig af dagens dato og af den gemte rute.
- "Fjern" på en fil spørger nu "Fjern <fil>?" alle steder (modal, Udestående,
  portalens valgte filer, produktblad). Fælles hjælper `cwConfirmRemove` i ui_kit.jsx.
- Overblik: offentlige data og kundens materiale står i ét kort med to kolonner
  ("Offentlige data" og "Fra kunden"). Kundens punkter er én liste med
  statusetiket som tekst ("Til gennemgang" først og fed, derefter efter
  upload-dato); valgfrit materiale, der ikke er sendt, ligger i foldet
  "Valgfrit materiale (n)". Ingen "Påmind" på valgfrie punkter. På smal skærm
  står "Fra kunden" først.

**Åbne punkter fra reviewet (ikke rettet):**
- Et afvist punkt, der sendes igen, beholder ikke kundens første filer. Sådan
  var det også før. Det er en produktbeslutning, om en afvisning betyder
  "erstat" eller "tilføj".
- e-conomic-dialogen siger "Crediwire" og samtykket "EIFO". Login-dialogen er en
  åben beslutning (phishing-indtryk).
- Kunden kan ikke se sit sagsnummer i portalen.
- På Overblik nævnes status stadig flere steder: overskrift, knap og trin (T5).
- Små ting: folde uden antal ("Egne kriterier", "Sådan er tallene beregnet"),
  forskellige ord for frist ("frist", "svarfrist", "Sagens frist") og for upload
  ("Upload for kunden", "Tilføj fil", "Upload fil").
- Når rådgiveren tilføjer en fil til kundens levering, står hele punktet som
  "Uploadet af dig" (fandtes også før).

**Rettelser i Regnskab og Budget (2. okt.).** På Finansielt overblik kan
rådgiveren rette posterne i regnskabsårene, de realiserede perioder og
budgetkvartalerne direkte i tabellen. Klik, Enter eller F2; Enter eller Tab
gemmer, og Esc fortryder. Summer, nøgletal, kontroller, 2026E og 2027B kan
ikke rettes; de regnes om.
- **Markering:** en rettet celle har svag blå baggrund og en prik. Tooltippen
  viser hvem, hvornår, det oprindelige tal (Årsrapport, Periodetal eller
  Kundens budget) og en valgfri begrundelse.
- **Oversigt:** "Vis rettelser (n)" er grupperet i Regnskab og Budget, med
  Fortryd pr. rettelse og Fortryd alle, begge med bekræftelse.
- **Budget:** den gamle budgetfold er fjernet (koden er slettet). "Importér
  budget" laver rettelser med Excel-filens navn som begrundelse.
- **Gemning og eksport:** rettelserne gemmes i `kabul:fin-edits:nordhavn` og
  logges. Excel-eksporten under Dokumenter bruger de rettede tal.
- **Låst:** der kan ikke rettes efter indstilling.
- **Test:** `SP\design\fin_edit.js` (101 tjek, da og en).
- **Ikke lavet:** månedsniveau i budgettet. Memoet slår ikke rettelserne
  igennem, fordi det henter tal fra CASE_FACTS.

**Generalprøven er brudt af en anden session (2. okt.).** credit-model-06 har
skjult Indstilling, erstattet Credit memo med en pilot (`memo_handoff.jsx`) og
ændret tekster i anmodningsmodalen. `rehearsal/run/demo.js` består til og med
trin 2b og skal skrives om, når piloten er på plads.

## Hensyn til produktion

Ting, prototypen bevidst forenkler, men som skal tænkes ind, når det bygges
rigtigt. Tilføj nye punkter her, efterhånden som de dukker op.

1. **Genhentning af offentlige data (aftalt 2. okt.).** En sag kan løbe i uger,
   og komitéen skal beslutte på aktuelle data.
   - **Systemet holder øje, rådgiveren beslutter.** Abonnér på CVR-hændelser og
     vis ændringer som én linje i kildens række, fx "Ny årsrapport for 2026
     offentliggjort 3. okt.", i stedet for at rådgiveren skal huske at hente igen.
   - **Vis forskellen før skift.** Fx "Bestyrelse: Henrik Bak ud, Lise Krogh
     ind" eller "Egenkapital 2025: 4,1 → 4,3 mio.". Rådgiveren godkender, at
     sagen bruger de nye data.
   - **Versioner, ikke overskrivning.** Gamle hentninger gemmes som tidligere
     versioner. Memoets tal og henvisninger peger på den version, de er skrevet
     ud fra. Findes nyere data, markeres det i memoet ("Nyere CVR-data findes").
     Teksten må aldrig ændre sig i stilhed.
   - **Låst efter indstilling.** En ny hentning rører ikke den frosne version.
     Den kan kun give en note eller en ny version af indstillingen.
   - **Automatisk tjek ved "Indstil".** Klarhedstjekket henter CVR, PEP og
     sanktioner igen og gør ændringer til et punkt i tjekket.
   - **Pr. kilde:**
     - CVR, ejere, PEP og sanktioner: overvågning, forskel og versioner.
     - Brancheopslag og markedsdata: manuel "Hent igen".
     - Produktbeskrivelse og bløde signaler: manuel "Hent igen". Det er
       AI-sammenfatninger, så hver hentning koster, og rådgiveren skal kunne
       beholde den gamle tekst.
   - **UI:** "Hent igen" som lille link ved "hentet 29. sep." i rækken under
     Offentlige data, ikke som en stor knap.
2. **AI-adgang.** Prototypen beder rådgiveren om en personlig Anthropic-nøgle.
   I produktion bør det være "AI via EIFO's aftale", med nøgle og model under
   Avanceret.
3. **Login til regnskabssystemet.** Den simulerede e-conomic-login ligner
   phishing (adgangskodefelt på crediwire.app). I produktion skal det være et
   rigtigt OAuth-flow i et vindue hos e-conomic. Samtykke og login skal også
   bruge samme afsender (EIFO eller Crediwire, ikke begge).
4. **Afviste punkter.** Det er uafklaret, om en ny levering efter en afvisning
   erstatter kundens første filer eller lægges oveni. I dag erstatter den. Det
   skal være et bevidst valg, og kunden skal kunne se det.
5. **Aktivitetsloggen gemmes som tekst** på det sprog, den blev skrevet på. I
   produktion skal hændelser gemmes som nøgler og data og oversættes ved visning.
6. **Kundens sagsnummer.** Kunden kan ikke se sit sagsnummer i portalen. Det
   bør stå i portalen og i mails, så kunden kan henvise til det.
7. **Brugsvilkår og privatlivspolitik** kan ikke åbnes i demoen. De skal findes,
   før kunder giver samtykke.

## Hvad der mangler

Punkt 13, 14, 16, 17 og 18 fra august er lavet (se ovenfor). Tilbage:

15. **Status pr. kildehenvisning ses kun ved klik.** Kildeviseren er rettet, men
    ✓/? står ikke i teksten.
19. **Tekststørrelser**: mange tekster under 12 px og mange inline
    skriftstørrelser; bevidst ikke ændret.
20. **Rådgiverskærmene ved 390 px** (telefon): memo og Overblik er for brede.
    Kundeportalen virker på telefon.
21. **Aktivitetsloggen gemmes som tekst** på det sprog, den blev skrevet på, og
    står derfor på dansk i engelsk visning.

## Udestående som ikke er kode

**Kildedokumenterne** er gjort konsistente i runde 3-5 (ejerbog, femårsoversigter,
anlægs- og realkreditlån, kapitalindskud, gældsfordeling). Seks henvisninger står
stadig som "Kontrollér sammenhængen", fordi memoet omskriver kilden.

**En OpenAI-nøgle blev delt i klartekst i samtalen 4. august.** Jesper skal
trække den tilbage på platform.openai.com/api-keys hvis det ikke allerede er sket.

## Konventioner

- Dansk i alt brugervendt indhold. Aldrig lange tankestreger.
- Firmanavnet staves Crediwire med lille w.
- Commit-beskeder og PR'er på engelsk.
- Ingen push eller PR uden at Jesper beder om det.
- Bump versionsnummeret i `index.html` når en fil ændres, ellers cacher browseren.
- `src/memo.jsx` er over 500 KB. Babel skriver så en byggenote som
  `console.error`; den filtreres i `index.html`. Del filen op, hvis den vokser
  meget mere.
- Skriv aldrig `.jsx`-filer med PowerShells `Set-Content -Encoding UTF8`. Den
  læser UTF-8 som ANSI og ødelægger æøå. Brug `[System.IO.File]::WriteAllText`
  med `UTF8Encoding($false)`, eller Edit-værktøjet.

## Kundens opstart i portalen (2. oktober)

Grundlag: mappen `Indsamlingsflow_i_dag` (dagens flow hos Nordea m.fl.). Det, der
manglede i vores portal, er bygget ind: opret bruger og log ind, vilkår, CVR og
virksomhed, aftalen med EIFO med et eksplicit ja til datadeling, begrænset eller
løbende datadeling og valg af regnskabssystem. Engangskoden (482913) er fjernet.
Backup før ændringen: `..\credit-model_backup_2026-10-02_foer-indsamlingsflow`.

**Kundens vej** (`src/portal_onboarding.jsx`, ny fil, indlæses efter new_case_portal.jsx):
1. *Opret jeres bruger*: mailen er udfyldt fra anmodningen, adgangskoden skal have
   8 tegn, et tal og et lille og stort bogstav. Har virksomheden allerede en bruger,
   afvises oprettelsen. *Log ind* har "Husk mig i 30 dage" og "Glemt adgangskode?"
   (demo: der sendes ingen mail). Adgangskoden gemmes kun som et kort fingeraftryk.
   Demoens kode er det, kunden selv valgte; "Spring opstarten over (demo)" bruger
   `Nordhavn2026`.
2. *Brugsvilkår*: kryds er påkrævet. Nyheder fra Crediwire er et separat og
   fravalgt kryds. Databehandleraftalen er bevidst ikke med (EIFO er
   dataansvarlig, som besluttet i september).
3. *Jeres virksomhed*: CVR er udfyldt og skal være sagens (et andet CVR afvises
   med forklaring), navn på kontaktperson, og kryds for "revisor, bogholder eller
   rådgiver". Med det kryds skal personen på næste trin også bekræfte, at de må give
   samtykke på virksomhedens vegne, og samtykket og historikken viser revisorens navn
   ("Lars Holm (revisor eller rådgiver) gav læseadgang på vegne af kunden").
4. *Jeres aftale med EIFO*: "Ja, vi accepterer at dele data med EIFO" skal
   afkrydses. "Vi sender tallene selv" springer datadeling og regnskabssystem over.
   Folden "Hvilke data deler I?" lister kontoplan, saldobalance, periodetal og
   debitordata, ikke posteringer, bilag eller netbank.
5. *Hvor meget må EIFO se?*: løbende deling (anbefalet) eller til og med en
   bestemt måned (forvalgt, seneste afsluttede måned). Begrænset adgang lukker,
   når sagen er afgjort.
6. *Forbind jeres regnskabssystem*: e-conomic, Billy, Dinero eller andre i en
   rullemenu, eller "Vi venter på vores revisor". Forbindelsen gemmer samtykke,
   saldobalance og en debitorliste samlet, når alt er hentet (aldrig et samtykke
   uden tal). Er Periodetal med i anmodningen, lander filerne der.
7. Velkomsten og oversigten som før. Oversigten viser forbindelsen med "Træk
   adgangen tilbage", og punktet Periodetal kan forbinde senere med de samme skærme
   (`PortalErpSetup`).

**Tilstand:** `CW.onboarding()` (localStorage `kabul:onboarding:nordhavn`) med
`account, terms, company, agreement, sharing, erp, doneAt`. `CW.setOnboarding`
gemmer og logger kun, når et trin faktisk ændrer sig. `CW.onboardingStep()` giver
det næste trin. Samtykket har nu `mode: 'ongoing'|'until'` og `dataUntil`.
Gemte demotilstande fra før (portalens `accepted: true`) regnes som færdig opstart.

**Rådgiverens forhåndsvisning ("Kundeside") ændrer intet.** Den mørke bjælke viser,
hvor kunden er ("Kunden er nået til trinnet Datadeling (trin 5 af 7)"), og knapper
til alle kundens skærme: Opret bruger, Log ind, Vilkår, Virksomhed, Aftale med EIFO,
Datadeling, Regnskabssystem, Velkomst og Oversigt. Under kortet står forrige og
næste skærm. Alt, der er kundens handling, er mærket `data-cust-act`. Klikket stoppes
i portalen, og en note siger fx "Kunden siger selv ja ... Intet er ændret". Desuden
afviser `case_state.js` alle kundehandlinger, mens forhåndsvisningen er åben
(`previewBlocked`: upload, send, bemærkning, fortryd, revisor, samtykke, "Vi er
færdige", beskeder, læst-markering og opstart). Forhåndsvisningen slås til, før
portalen tegnes. Uploads for kunden sker kun med "Upload for kunden" i sagen.
**Ændret adfærd:** tidligere kunne rådgiveren uploade og skrive i forhåndsvisningen
(logget som rådgiveren). Det kan rådgiveren ikke længere.

**Rådgiverens sag:** "Hændelser fra kunden" viser kundens opstart: ingen bruger,
trin i gang, nej til datadeling, venter på revisor, samtykkets type (løbende eller
tal til og med en dato), og om en lukket adgang skyldtes kunden eller afgørelsen.
Den første anmodningsmail forklarer nu Crediwire, at man opretter en bruger, og at
regnskabssystemet kan forbindes (eller revisoren hjælpe).

**Øvrigt:** dialoger oven i hinanden lukker nu kun den øverste ved Escape
(`useDialog` har en stak). En afslået sag viser "Sagen er afsluttet" uden login.

**Test** (scratchpad for session bbfd8932, `SP`):
`C:\Users\jnj\AppData\Local\Temp\claude\c--Users-jnj-CrediWire-ApS-Dropbox-Product-team-AI-Agents-Hello-world-credit-model\bbfd8932-9324-40a2-aeb4-3f4ed37f2694\scratchpad`
- `ob_e2e.js da|en` (52 kontroller): hele kundens vej, log ud og ind, og at
  forhåndsvisningen ikke ændrer tilstanden.
- `ob_paths.js` (26): nej til datadeling og forbind senere, venter på revisor,
  genindlæsning, demoknappen, gamle tilstande, forhåndsvisning af en færdig kunde.
- `ob_fixes.js` (43): fundene fra review- og blindrunden (eksisterende bruger,
  Escape og lukket fane under hentning, afvisning logges, læst-markering,
  Bruger/Materiale i forhåndsvisningen, tekster efter tilbagetrækning og afgørelse,
  revisor med fuldmagt, glemt adgangskode i forhåndsvisningen).
Kør med `CDP_PORT=<port> BASE=http://localhost:8080/ node <fil>`.

**Verifikation:** fem reviewere (kunde, rådgiver, compliance, QA/tilgængelighed,
kode) gav 2 af 5 JA. Alle Høj-fund og de fleste Mellem-fund er rettet. Derefter
kom en blind runde med fire nye roller (revisor, erfaren rådgiver, engelsk CFO
kun med tastatur, kode) uden kendskab til tidligere fund. Resultatet var 3 af 4 JA.
Revisoren sagde NEJ, fordi flowet ikke tog højde for en revisor. Det er rettet
bagefter: fuldmagt, navn i samtykket, ingen forudfyldt Susanne og en vej for
revisoren, når der allerede er en bruger. De rettede fund er ikke efterprøvet af de
blinde roller igen. Rapporterne ligger i `SP` under mapperne review og blind.

**Kendt:** den fælles regressionspakke (`regress.js`) og generalprøven (`demo.js`)
fejler i dag uafhængigt af denne ændring. Backuppen fra før ændringen fejler de samme
14 suiter (memo i Copilot-tilstand, ny portaloversigt og nye Overblik-kort fra andre
sessioner), og generalprøven stopper ved trin 1b ("Virksomhed og facilitet").
Portaltrinnene i generalprøven (4a og 8b) er skrevet om til opret bruger og
opstarten. Backup af det gamle script: `demo.js.foer-opstart.bak`.

Ikke lavet (fra reviewene, åbne beslutninger for Jesper):
- Flere brugere pr. virksomhed. Demoen har én bruger. En revisor, der får linket
  videresendt, når kunden allerede har en bruger, bliver bedt om at få et
  revisorlink via "Få hjælp fra revisor eller bank".
- Databehandleraftalen i vilkårstrinnet (dagens flow har den, vi har bevidst ikke).
- Nyheder fra Crediwire som valgfrit kryds er med, fordi dagens flow har det.
  Overvej, om det passer til EIFO.
- "Træk adgangen tilbage?" åbner med fokus på den farlige knap (fælles
  bekræftelsesdialog for hele appen, ikke ændret).
- Kladder overlever ikke et sprogskift midt i et trin.
Engelsk bruger både "interim figures" og "period figures". Revisoren kan ikke
inviteres direkte fra trinnet Regnskabssystem; velkomsten henviser i stedet til
"Få hjælp fra revisor eller bank".

## Fanerne på sagen er omdøbt (5. oktober)

Fanerne hedder nu **Overblik** (før "Sagen") og **Virksomheden** (før "Finansielt
overblik"), derefter Dokumenter og Credit memo. Virksomheden rummer stamdata,
regnskab og budget, produkt og marked, ejerskab og bestyrelse, derfor det navn.
Sektionen med CVR-oplysninger på den fane hedder nu "Stamdata". Engelsk: Overview,
Company, Company details. Ældre afsnit i denne fil bruger stadig de gamle navne.
Samtidig er rettet, at sidens titel kunne blive stående som "Kundeportal", når man
gik fra portalen til en sag.

## Dialog med kunden står altid på Overblik (5. oktober)

Før blev "Dialog med kunden" først vist, når anmodningen var sendt, eller der var
en besked. Nu står den altid på Overblik, så rådgiveren også kan skrive i
vurderingsfasen. Før anmodningen er sendt, står der under feltet: "Anmodningen er
ikke sendt endnu. Kunden ser beskeden i sin portal, når anmodningen er sendt." Det
passer med portalen, som ikke kan åbnes uden en anmodning. `CWConversation` har
fået en valgfri `note`. Test: `SP\dialog.js` (8 kontroller).
