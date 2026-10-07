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

**Vejledning til den videre AI (5. oktober, version 2): `00_README_for_AI.md`.**
Markdown-fil til Copilot (eller en anden AI), der skal læse sagens materiale og hjælpe
med credit memoet. Den står under Dokumenter og først i "Fra Crediwire" på Credit
memo, og den kommer med i "Hent alle". Den bygges, når den hentes (hoGuideMarkdown i
memo_handoff.jsx), af præcis de filer, som "Hent alle" henter (hoGroups).
Valg: altid engelsk, også i den danske app, fordi læseren er en AI og modeller følger
engelske instruktioner bedst. Sagens filer er danske, så der er en dansk-engelsk
ordliste, og memoet bedes skrevet på dansk. Navnet README med 00_ foran gør den til
"læs først"-filen, sorteret øverst. Den er kort (ca. 85 linjer): YAML-metadata, fire
principper med begrundelse, en filtabel (fil, hvad, kilde og dato, pålidelighed), fakta
om tallene, kendte uoverensstemmelser (CASE_FACTS.conflicts, engelsk tekst) og
ordlisten. Der er bevidst ingen fast læserækkefølge eller afsnitsskabelon, så den
videre AI ikke bindes unødigt. Registret læser ikke dens indhold (`lazy: true`), og
CW.downloadDoc gemmer .md som tekst. Test: `scratchpad\guide_test.js` i session 746e68ca.

**AI-teksterne kan rettes, gendannes og køres igen (7. oktober).** I "Produkt, marked
og branche" (financials.jsx) er produktbeskrivelsen, markedet og hvert PEST-punkt en
FinAiBlock med synlige ikoner (FinIconBtn, altid til stede): blyant (Ret tekst), pil
i ring (Kør AI igen) og fortryd-pil (Gendan AI-teksten, kun når teksten er rettet).
Stamdata (CompanySection) har det samme: blyant pr. felt, fortryd-pil "Gendan … fra
CVR" på rettede felter (med "Rettet af … · CVR: oprindelig værdi") og "Hent stamdata
igen fra CVR" i sektionens hoved (demo: integrationen kaldes ikke; rettelser
bevares). CVR-nummeret kan ikke rettes. Tilstand: `kabul:fin-cvr:nordhavn`;
eksporten Virksomhedsprofil_CVR.pdf bruger cvrVal. Test: `scratchpad\icons_test.js`. Under teksten står "Rettet af … · dato" eller "Nyt AI-udkast ·
dato". Kør AI igen på en rettet tekst beder om bekræftelse. Er der forbundet en AI
(window.AI.isReady(), ai.js), skriver den et nyt udkast ud fra faktaarket,
ledelsesberetningen 2025 og markedsrapporten (finAiContext). Ellers skifter demoen
mellem to forberedte AI-udkast (FIN_AI_DEFS[id].alt) og siger det i en toast.
Tilstanden ligger i `kabul:fin-ai-texts:nordhavn` (Nulstil demo rydder den).
Eksporten Produkt_marked_og_branche.pdf bruger finAiText og skriver "(Rettet af …)"
under rettede tekster, og README'en nævner det. Test: `scratchpad\aitext_test.js`
i session 746e68ca.

**Prompt-værksted (7. oktober, ruten `prompts`, src/prompt_workshop.jsx).** Internt
menupunkt under Kontomapping. Liste over de tre prompts og en editor: websøgning
til/fra, System og Opgave, pladsholdere man klikker ind ved markøren, Gem, Fortryd
ændringer og Hent som fil. Lokalt gemmer devserver.js direkte i `prompts/*.md`
(`POST /local-prompts/save`) og lægger den forrige version i `prompts/.historik/`
(`GET /local-prompts/history`), som kan indlæses igen. På et hosted domæne gemmes i
browseren (localStorage `cw_prompt_override:<fil>`; Nulstil demo sletter ikke), og
finAiPrompt bruger browserens kopi via `window.CW_PROMPTS.load`. "Prøv på Nordhavn"
kører kladden med finAiGenerate uden at gemme, viser ord, linjer og tid, prompten
der blev sendt, og kan bruge teksten som AI-udkast. AI-forbindelsen skiftes med
memoets AiSettingsDialog. Uden websøgning får AI'en altid besked om, at den ikke kan
søge (ellers forsøgte Claude Code at søge og løb tør for ture). Test:
`scratchpad\pw_test.js` (`--real` kører én rigtig kørsel) i session 746e68ca.

**Prompts i `prompts/` og web-søgning (7. oktober).** "Kør AI igen" på AI-teksterne
bruger prompt-filerne i `prompts/` (produktbeskrivelse.md, markedet.md, pest.md; se
prompts/README.md). Filen hentes ved hvert klik (finAiPrompt i financials.jsx), så
Jesper kan rette den uden at røre koden: `## Indstillinger` (websøgning: ja/nej),
`## System` og `## Opgave` med pladsholdere som {virksomhed}, {materiale} og
{nuvaerende_tekst}. {materiale} er ledelsesberetningen i den nyeste årsrapport og
markedsrapporten, men bevidst ikke regnskabstal. Web-søgning: `AI.stream({ webSearch })`
og `AI.canSearch()` i ai.js. Anthropic-API'et bruger server-værktøjet
`web_search_20260209` (og falder tilbage til `web_search_20250305`) og smider teksten før
sidste søgning væk. Den lokale bro (devserver.js) giver Claude Code `--allowed-tools
"WebSearch WebFetch"` og op til 12 ture og sender kun det endelige svar. ChatGPT,
Copilot og Codex søger ikke; så får AI'en besked i systemprompten. Testet med Claude
Code på Markedet: 57 ord, 3 linjer, kilder i parentes, 3½ minut. Husk at genstarte
devserver.js efter opdatering. Test: `scratchpad\realai_test.js` (bruger abonnementet).

**Kundeside og Kundeflow (5. oktober).** Rådgiverens forhåndsvisning har to spor
(sagshovedets knapper, WSCustomerPreview i workspace.jsx → CustomerPortal med
`flow`):
- **Kundeside** åbner altid på kundens oversigt uden skærmrækken. Har kunden ikke
  gjort opstarten færdig, står PortalPvObStatus øverst som én kort linje (efter
  Jespers skitse 6. oktober): prik, "Kunden er ikke startet endnu" (eller "Kunden
  er i gang med opstarten"), "Står ved opret bruger · trin 1 af 2", en stille knap
  "Se hvad kunden ser" (Kundeflow på kundens trin; uden bruger er det
  landingssiden) og knappen "Send invitation igen" (hvornår den sidst blev sendt,
  står som tooltip). Ingen tidslinje og ingen forklarende tekst.
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

## Kontomapping: kundens saldobalance fra e-conomic (5. oktober)

De realiserede kvartaler i Regnskab (Q1, Q2 og jul-aug 2026) kommer nu fra
kundens saldobalance i stedet for hårdkodede periodetal.

- **Kilden er et Excel-ark:** `data/Saldobalance_e-conomic_jan-aug_2026.xlsx`.
  Det har en e-conomic-agtig kontoplan for Nordhavn med 125 rækker:
  overskrifter, 85 drifts- og statuskonti og sumkonti. Kolonnerne er Kontonr,
  Kontonavn, Kontotype, Sum fra/til, Primo 01-01-2026, ét beløb pr. måned
  (jan-aug 2026) og Saldo 31-08-2026.
  - Fortegnene er som i e-conomic: debet plus og kredit minus.
  - Driftskonti har månedens bevægelse, statuskonti har primo plus bevægelser.
  - Sumkonti og kontrolrækken er SUMIFS-formler.
  - Fanen "Læs mig" forklarer arket.
  - Arket bygges af `data/make_trial_balance.py` (`python data/make_trial_balance.py .`).
- **Tallene er lavet, så standardmappingen giver præcis sagens tidligere
  kvartalstal**, for både resultat og balance. Memo, nøgletal og eksporter
  flytter sig derfor ikke, før nogen mapper om. Saldobalancen går i nul hver
  måned, fordi banken udligner.
- **`src/mapping.js` (`window.CW_MAP`)** henter arket med fetch og SheetJS.
  - Det holder Crediwires kategoritræ (opgørelse › gruppe › undergruppe ›
    kategori), og hver kategori peger på en række og evt. en detaljelinje i
    `FIN_LAYOUT`.
  - Det har standardmappingen pr. kontonummer. Konto 1090, 3850 og 6240 står
    som "Tilpasset" af Mette.
  - Rådgiverens ændringer gemmes i `kabul:mapping:nordhavn`, som Nulstil demo
    rydder.
  - `compute()` lægger beløbene sammen pr. række og periode i tabellens
    fortegn.
- **`finSyncMapping()` i financials.jsx** skriver tallene ind i
  `ANNUAL_REPORT.q` (summer som i `FIN_EDIT_SUMS`) og i `qvals` på rækker uden
  ref og på detaljelinjerne.
  - Detaljelinjerne viser derfor nu tal i kvartalerne.
  - Egenkapitalen er egenkapitalkontiene plus årets resultat til og med
    perioden.
  - Hentes arket ikke, står de gamle periodetal, og der vises en note.
  - Rettelser i tabellen ligger stadig ovenpå: originalen er nu det mappede
    tal, og kilden hedder "Saldobalance fra e-conomic".
- **Mapperen (`src/mapper.jsx`, `MapperPage`)** er en side for sig med ruten
  `mapping`, som åbnes med "Kontomapping" i venstremenuen (`Sidebar` i
  shell.jsx).
  - Punktet er stiplet med et DEMO-mærke, fordi det ikke er aftalt, hvem der
    mapper, og hvor det skal ligge i produktet.
  - Regnskab har ingen egen knap; kun advarslen om konti uden mapping fører
    til siden (hændelsen 'cw-open-mapper').
  - Siden har "Se Regnskab" øverst.
  - Et udkast, der ikke er gemt, bliver stående, når man skifter side
    (`MAP_DRAFT`), men ikke ved genindlæsning.
  - Den er bygget efter Crediwires mapper:
  - Råbalance (konto, navn, bogført værdi) og Crediwire-kategori med
    "Vælg" og metodeikon (automatisk, tilpasset, ikke mappet, ikke gemt).
  - Et panel med opgørelse, grupper, undergrupper og "Flyt hertil" samt fanen
    "Søg efter kategori".
  - Periodevælger, søgning, metodefilter, Shift-klik for at vælge et
    interval og klik på en konto for at se månedsbeløbene.
  - "Hent Excel", "Nulstil ændringer" og "Gem ændringer". Gem logger
    hændelsen.
  - Driftskonti kan kun flyttes til resultatopgørelsen og statuskonti kun til
    balancen.
- **Nye konti i arket**, som standardmappingen ikke kender, står som "Ikke
  mappet". Beløbet mangler så i Regnskab, og der vises en advarsel med antal
  på knappen.

Efter en kodegennemgang og en blind brugertest er følgende rettet:
- **Excel-arket:** sumkontiens SUMIFS slutter på rækken over sig selv, så der
  ikke er cirkulære referencer.
- **Perioderne** bygger på månedsnøgler ('2026-01'), og et ark, der mangler
  måneder eller primo, giver en tydelig fejl.
- **Advarsel om konti uden mapping** gælder også konti med kun en primosaldo.
- **Ændringer i en anden fane** slår igennem (storage-hændelsen).
- **Rettelser i tabellen** viser og nulstiller til det aktuelle kildetal
  (`finOrigOf`).
- **2026E for resultatposter uden budget** (fx Andre driftsindtægter) er summen
  af kvartalerne, så kolonnen går op.
- **"Skjul tomme rækker"** tager hensyn til kvartalstal.
- **Mapperen:**
  - Ét tabstop pr. konto, og et skjult "Gå til kategorierne"-link.
  - Fokus går til Gem efter "Flyt hertil".
  - En forklaring med genvej, når de valgte konti ikke passer til opgørelsen.
  - Hver kategori viser, hvor den lander i Regnskab ("I Regnskab: …").
  - Søgning på kategori.
  - "Tilbage til automatisk" pr. konto.
  - "Ekstraordinære poster" er stavet rigtigt.
- **Fælles i case_state.js:**
  - `CW.confirm` lægger sig på dialogstakken, så Esc og Tab ikke går til
    dialogen nedenunder, og har fået et nyt flag, `focusCancel`, som mapperen
    bruger.
  - `useDialog` fanger Tab, også når fokus står på en titel.

Ikke rettet med vilje: Saldobalancens "AKTIVER I ALT" og "PASSIVER I ALT"
afviger med periodens resultat, som i e-conomic, før året er lukket.

Backup før ændringen: `..\credit-model_backup_2026-10-05_foer-mapper` (src,
index.html, styles.css, tokens.css, HANDOVER.md). Test: `mapper_test.js` (46
kontroller pr. sprog) i session d1d0f86c's scratchpad. To gamle tests er
forældede af omdøbningen den 5. oktober:
- `company_test.js` leder efter sektionen "Virksomheden".
- `fin_test.js` leder efter knappen "Vis kvartaler".

## Regnskab v2: grafen efter designet (5. oktober)

Grafen over Regnskab under Virksomheden følger designet "Virksomheden v2" fra
Claude Design (projekt be34be2d, mappen `design_handoff_regnskab_graf`). Den er
tegnet med prototypens eget designsystem (Inter, appens farver, `.card`, `.btn`)
i stedet for designets navy, orange og Source Sans.

Jesper har bevidst fjernet tre ting fra de første versioner:
- menuen med forvalg (Indtjening, Soliditet osv.),
- knapperne ved rækkenavnene,
- omridset med årstakt for 2027B.

Lav ikke noget ved graferne, som ikke står i designet. **Tabellen er som før.**
Jesper ville kun have grafen lavet om. Det eneste, der er ændret i tabellen, er,
at 2026 og 2027 følger det, kunden har leveret (se nedenfor).

**Grafen** (`src/fin_chart.jsx`, `FinChart`, eget kort over tabellen):
- "Omsætning og EBITDA" med fem kolonner: 2023, 2024, 2025, 2026 og 2027.
- Omsætning er primærblå: fyldt er realiseret, skraveret er budget, stiplet er
  fremskrevet. EBITDA-søjlerne er skifer.
- En strimmel med EBITDA-margin.
- Kolonnerne følger tabellen: grafen måler tabelhovedet (`useFinTableCols`), så
  2023, 2024, 2025, 2026 og 2027 står lige over årene i tabellen. Detaljefeltet til
  venstre er lige så bredt som rækkenavnene. Når kvartalerne er foldet ud, eller
  før målingen, bruger grafen sit eget gitter (300 px / 260 px under 1180 px).
- Detaljefeltet viser omsætning og EBITDA for den valgte periode, kilde og
  marginer. Der vises ingen procentændring; Jesper fjernede "+25 % mod 2024".
  Feltet følger hover og står som standard på 2025.
- Tabellens rækkenavne er præcis så brede som det længste navn (`width: 1%` på
  `th.fin-c1`). På smal skærm (under 1180 px) må de bryde, mindst 200 px. Grafen
  følger med og får pladsen.
- EBITDA-margin: punkterne står lige under årstallene (grafen måler årstallenes
  midte). Linjen og punkterne bruger samme koordinater, så de rammer hinanden.
- Mangler der tal til margin, siger strimlen det og linker til "Anmod kunden om
  budget":
  - "Ingen margin for 2026 og 2027 endnu" uden budget og periodetal,
  - et link under 2027 med periodetal, men uden budget.
- Jespers egne ændringer i forhold til designet:
  - forklaringen hedder "Omsætning" (ikke "Realiseret"),
  - knappen hedder "Anmod kunden om periodetal" (ikke "Forbind kundens
    bogføring").
- **Årsrapport uden omsætning** (små virksomheder må udelade den):
  - Året viser boksen "Omsætning ikke oplyst" med "Indtast omsætning", som åbner
    cellen i tabellen, og "Anmod om intern årsrapport", som vælger `m-annual` i
    Anmod om materiale.
  - Detaljefeltet forklarer, hvorfor tallet mangler.
  - `finFillable()` i financials.jsx tillader, at en tom omsætning i en årskolonne
    rettes. Summerne står som i årsrapporten.
- Prognosen har tabellens 2026E-flade og et stiplet skel. "Skjul graf" huskes i
  `kabul:fin-chart`.
- Når kvartalerne er foldet ud, bliver grafen ved de fem år. Tabellens omslag har
  ingen indre lodret rulning længere, så grafen ruller væk med siden.

**Data styrer tilstanden** (`finDataState()` i financials.jsx):
- `hasBudget`: punktet `m-budget` er modtaget eller godkendt med en fil, eller
  rådgiveren har importeret et budget ("Excel-import" i rettelserne). "Har vi
  ikke" tæller ikke.
- `months`: 8, når `m-interim` er modtaget eller bogføringen er forbundet
  (`CW.consent()`), ellers 0.

| Tilstand | Graf | Tabel |
|---|---|---|
| 1. budget + periodetal | 2026E = jan-aug realiseret + budget sep-dec; 2027B budget | som før |
| 2. kun budget | 2026E = budget sep-dec alene; "Anmod kunden om periodetal" i feltet | 2026E "sep-dec budget" |
| 3. kun periodetal | 2026 = jan-aug + stiplet fremskrivning (÷ 8 × 12); 2027: "Intet budget" + "Anmod kunden om budget" | 2026 = jan-aug, 2027 "-" |
| 4. ingen af delene | kortet "Ingen prognose for 2026 og 2027" med "Anmod kunden om budget", "Importér budget" og "Anmod kunden om periodetal" | "Ingen data", ingen "Udfold kvartaler" |

Afvigelse fra designet i tilstand 2: designet viser et budget for hele 2026, men
budget v3 dækker kun sep 2026–Q3 2027. Derfor står 2026E som budget for sep-dec, og
der vises ingen ændring mod 2025.

**Knapperne:** "Anmod kunden om budget" og "Anmod kunden om periodetal" vælger
`m-budget` eller `m-interim` i "Anmod om materiale" (`CW.setSelection`) og åbner
dialogen på Overblik (`window.CW_REQUEST_MORE`). "Importér budget" åbner
filvælgeren.

**Tabellen:**
- Kolonner uden leverede tal har `col.off`, så `finRawValue` og `finChildVal`
  returnerer null og tabellen viser "-".
- 2026 har `mode: 'ytd'` (realiseret alene) eller `'budget'` (budget alene).
- Memoet, Overblik og eksporterne læser stadig `ANNUAL_REPORT` direkte.

**Test:** `v2_test.js da|en` (75 kontroller pr. sprog, inkl. flugtning, margin-punkter, smal skærm og årsrapport uden omsætning) i scratchpad for session
bbfd8932. Skærmbilleder: `v2_shot.js`.

To gamle regressionstests var forældede af omdøbningen til "Udfold kvartaler" og
er rettet til den nuværende tabel, med budget og periodetal leveret i testdata:
- `design/data_check.js` (51/51),
- `r3/data/t2_fin.js`.

Den gamle version af testene ligger som `.foer-v2.bak`.

Backup før ændringen: `..\credit-model_backup_2026-10-05_foer-regnskab-v2`.

**Opdatering 6. oktober** (designet "Graph redesign without takt", Downloads):
- *Serier som knapper* i kortets hoved: Omsætning, Bruttofortjeneste og EBITDA.
  - Standard: Omsætning og EBITDA tændt. Valget huskes i `kabul:fin-chart`
    (`series`).
  - Titlen følger de viste serier, fx "Omsætning, bruttofortjeneste og EBITDA".
  - Søjlerne står i rækkefølgen EBITDA, Bruttofortjeneste, Omsætning med
    designets bredder (48/20, 26/26/16, EBITDA alene 48). Er tabellens kolonner
    smalle, skaleres søjlerne ned.
  - Farver: Omsætning er primærblå, Bruttofortjeneste lys blå (#7fa0e8), EBITDA
    skifer.
- *Reserve uden omsætning* (små virksomheder må udelade omsætningen):
  - Mangler den i alle årsrapporter, kan Omsætning ikke vælges, og knappen viser
    designets forklaring ved hover eller fokus.
  - Mangler den i ét eller flere år, er Bruttofortjeneste tændt som standard.
  - Detaljefeltet viser "Omsætning: Ikke oplyst", og marginerne står som "–".
  - Tabellen viser "Ikke oplyst" i omsætningscellen. Klik på den åbner feltet,
    så tallet kan indtastes (`finFillable`).
  - Boksen "Omsætning ikke oplyst" i grafen fra 5. oktober er taget ud.
- *EBITDA-margin-strimlen er taget ud* efter designets beslutning. Marginerne står
  i detaljefeltet og i tabellen.
- *Tabellens nøgletal* har nu de samme marginer som grafen: Dækningsgrad %
  (afløser Bruttomargin % og regnes på samme måde), Løn % af omsætning og
  EBITDA-margin %. Derefter Soliditetsgrad, Gæld / EBITDA og Likviditetsgrad.
- *Beholdt efter Jespers tidligere ønsker:* ingen procentændring i detaljefeltet,
  EBITDA vist i feltet, og knappen "Anmod kunden om periodetal".
- Test: `v2_test.js` er udvidet til 83 kontroller pr. sprog.

## Landingsside, Crediwires login og opstart på to skærme (6. oktober)

Jesper ville have den gamle landingsside tilbage og færre skridt i opstarten. Det
gik i to omgange: først blev de seks trin plus velkomsten lagt sammen til to skærme.
Derefter blev oprettelse og login flyttet ud til Crediwires egen side, så vi ikke
bygger vores eget login. Backup før ændringen: scratchpad for session 2e448e6b,
mappen `backup_onboarding_0958`.

**Kundens vej nu:**
1. *Landingsside* (`PortalLanding` i new_case_portal.jsx, efter backuppen fra
   30. september): "Anmodning fra EIFO · dato", "Kære {fornavn},", frist, boksen
   "Hvorfor crediwire.app?", kortet "Sådan foregår det" og "Kom i gang". Den vises,
   når der ikke er en bruger. Har virksomheden en bruger, går linket direkte til
   Crediwires login.
2. *Bruger, før login* (`ObUser` med `pre`, design "Bruger trin" fra Claude Design,
   runde 2, variant 2a): "Log ind eller opret bruger", virksomheden fra anmodningen og
   én knap, "Fortsæt med Crediwire". Returnerende kunder (logget ud) kommer også hertil.
3. *Crediwires egen side* (`PortalCwAuth`, en demo af omstillingen): hele skærmen
   uden portalens top, formular til venstre og budskab til højre. Mailen kommer fra
   invitationen og kan ikke rettes. Crediwire viser selv *Opret bruger*
   (adgangskoderegler) eller *Log ind* ("Glemt adgangskode?") ud fra mailen. Der er
   ingen "Har du allerede en bruger?"-link og ingen vilkår her. Knappen viser
   "Opretter bruger…"/"Logger ind…". "Tilbage til Materiale til EIFO" går tilbage
   til trinnet. Demonoten har to kryds: "Mailen har allerede en bruger" og "Brugeren
   har allerede virksomheden". I produktion er det en rigtig omstilling med retur.
   *Tilbage på Bruger* kommer en af tre visninger:
   - *Ny bruger*: "Færdiggør dine oplysninger". Grøn boks "Bruger oprettet." med
     "Skift bruger", Dit navn, Virksomhedsnavn og CVR (skal være sagens), brugsvilkår
     (knappen "Fortsæt til datadeling" er grå, indtil der er sat kryds) og nyheder.
   - *Kendt bruger uden virksomheden*: "Du er logget ind", "Logget ind som {navn}",
     "Virksomheden findes ikke på din bruger endnu …" og navn og CVR.
   - *Kendt bruger med virksomheden*: "Tjekker, om {virksomhed} findes på din
     bruger…" og derefter direkte videre til Datadeling.
   *Demo:* under kortet på Bruger står en stiplet række (`PortalObDemo`): "Før login",
   "Ny bruger", "Kendt bruger uden virksomheden" og "Kendt bruger med virksomheden".
   I portalen sætter knappen kundens tilstand (som efter en tur til Crediwire). I
   Kundeflow vises stadiet kun, og intet gemmes. Test: `demo.js da|en 1400|420`.
   **Ændret:** "Jeg er revisor eller rådgiver" er ikke med i designet og er fjernet.
   Fuldmagtskrydset på Datadeling vises derfor ikke længere. En revisor bruges via
   "Få hjælp fra revisor eller bank".
   En første version (navn og vilkår før Crediwire) blev bygget af en anden session
   kl. 12.39-12.50. Den er afløst af runde 2. Backup: scratchpad for session
   2e448e6b, mappen `backup_runde1_1314`.
4. *Del regnskabstal med EIFO* (`ObData`): løbende eller til og med en måned,
   regnskabssystem, folden "Hvilke data deler I?", "Ja, vi accepterer …" (og
   fuldmagt for revisoren) og "Forbind {system}". "Vi sender tallene selv" og
   "Vi venter på vores revisor" afslutter opstarten (det sidste vises ikke for
   revisoren selv). Aftalen og valget gemmes, før systemets login åbner.
5. *Oversigten*. Velkomsten efter opstarten (`PortalWelcome`) er fjernet, og portalen
   åbner aldrig på 'welcome' (gamle gemte skærme går til oversigten). Valgte kunden
   "Vi venter på vores revisor", står der et kort med "Bed revisoren om hjælp" og
   "Forbind nu".

**Tilstand:** samme felter i `CW.onboarding()`. `CW.ONBOARDING_STEPS` er
`['account', 'data']`, og `onboardingStep()` giver 'account' (mangler bruger,
vilkår eller virksomhed), 'data' eller null. En bruger fra før uden vilkår får
vilkårskrydset på trinnet Bruger. `PortalErpSetup` (punktet Periodetal og
oversigten) bruger det samme datadelingskort uden "send selv" og "vent på revisor".
Log ud (også "Ikke dig?") fører til Crediwires login. Gamle demotilstande uden bruger
får Opret bruger.

**Tekster, der er rettet, så de passer til flowet:**
- Invitationsmailen: "Første gang opretter I en bruger hos Crediwire. Har I
  allerede en, logger I bare ind."
- Landingssiden nævner brugeren hos Crediwire.
- Fanens titel og Kundeflow-knappens hjælpetekst.
- "Hændelser fra kunden" skelner mellem "venter på revisor" med og uden ja til
  datadeling.

**Rådgiveren:** Kundeflow starter på landingssiden (eller på trinnet, kunden er
nået til). Skærmrækken er Landingsside, Crediwire: Opret bruger, Crediwire: Log ind,
Bruger, Datadeling og Oversigt. Statusboksen på Kundeside og "Hændelser fra kunden"
tæller "trin x af 2" (Opret bruger, før der er en bruger, ellers Bruger).

**Test** (scratchpad for session 2e448e6b, mappen `ob`):
- `flow3.js da|en 1400|420` (50 kontroller, runde 2): Bruger før login, Crediwire
  (ny bruger, log ind, forkert adgangskode, tilbage), "Færdiggør dine oplysninger"
  med forkert CVR og vilkår, kendt bruger med og uden virksomheden, "Skift bruger",
  Kundeside og Kundeflow. `flow2.js` er forældet.
- `later.js`: forbind senere fra Periodetal.

Alle er grønne. Blind slutrunde (kunde og kode) før omstillingen til Crediwires side:
ingen Høj-fund. Mellem-fundene er rettet (venter på revisor på oversigten,
revisorens tekster, dialogen ved forbind fra oversigten, falsk "ja" i hændelserne).
**Forældet:** `flow.js` her og `ob_e2e.js`, `ob_paths.js` og `ob_fixes.js` fra
2. oktober tester de gamle skærme.

Ikke lavet (lave fund fra blindrunden): trinlisten viser Materiale som tredje punkt,
mens mobilen siger "Trin x af 2". Escape i regnskabssystemets login giver fokus til
overskriften og ikke til knappen. "Ca. 10 minutter" og "Kun Mette …" på
landingssiden er beholdt fra den side, Jesper bad om.

## Kundens oversigt: kortere tekster og mærkater (6. oktober)

Jesper syntes, de grå linjer på punkterne forvirrede mere, end de hjalp (fx "Mette har
tilføjet 1 fil for jer · 06-10-2026"). I `PortalHubRow` (new_case_portal.jsx) har et
punkt nu kun én grå linje, når den hjælper kunden: beskrivelsen (mangler),
"Påbegyndt, ikke sendt endnu" (kladde), kilden (fx "Hentet fra e-conomic"),
"Bemærkning sendt", rådgiverens note (afvist) eller "Hos jeres revisor: {navn}".
Datoer, antal filer og hvem der tilføjede dem står kun i detaljerne (pilen til højre).
Status står som en mærkat i designsystemets `.pill`: "Afventer godkendelse af EIFO"
(sendt eller bemærkning, ikke gennemgået endnu) og "Godkendt". Årsrapporterne fra CVR
står som ét punkt pr. år med en grøn mærkat "Hentet automatisk", fordi rådgiveren ikke
godkender dem. På mobil står mærkaten under titlen. Test: `hub.js da|en 1400|420`
(scratchpad for session 2e448e6b, mappen `ob`).

## Overblik: "Anmodet materiale" i stedet for "Afventer kunden" (7. oktober)

Kortet hed "Afventer kunden", men indeholdt også det, der venter på rådgiverens
gennemgang. Det hedder nu "Anmodet materiale" (`WSOutstandingCard` i workspace.jsx)
og viser kun det, der stadig er åbent, i to grupper: "Til din gennemgang" (først) og
"Hos kunden" (ikke sendt, afvist eller sendt videre til revisor/bank). Toppen af kortet
viser "1 til gennemgang · 4 hos kunden". Godkendt materiale står kun under "Materiale
på sagen", hvor kolonnen nu hedder "Godkendt fra kunden". Et punkt står dermed kun ét
sted ad gangen. Sagens fase "Afventer kunden" er uændret. Test: `anmodet.js da|en`
(scratchpad for session 2e448e6b, mappen `ob`).

## Spørg kunden om offentlige data, og mail fra dialogen (7. oktober)

- Under "Materiale på sagen → Offentlige data" har hvert dokument (årsrapporterne,
  "Produkt, marked og branche", Trustpilot) et diskret "Spørg kunden", når anmodningen
  er sendt. Det ruller ned til "Dialog med kunden" og vælger emnet i "Handler om".
- "Handler om" har nu to grupper: "Anmodet materiale" (punkterne) og "Offentlige data"
  (dokumenterne og CVR-registret). Emnet gemmes som `about` på spørgsmålet
  (`CW.ask`/`CW.sendMessage` i case_state.js) og vises ved beskeden hos begge parter.
- Rådgiveren kan sætte kryds i "Send også en mail til kunden": mailen bygges af beskeden
  (emne "Vi har et spørgsmål til …" eller "Besked fra EIFO", link til kundens side) og
  kan rettes, før den sendes, som ved "Stil spørgsmål til materialet". Mailen logges som
  `dialog-mail`. Kunden har ikke valget. Valget findes også, når rådgiveren skriver i
  forhåndsvisningen af kundens side (Kundeside). Test: `pvmail.js`.
- Test: `askpub.js da|en` (scratchpad for session 2e448e6b, mappen `ob`).

## Anmod om materiale uden mail (7. oktober)

I "Anmod om materiale" (og ved opdateringer) står "Send en mail til {navn} ({mail})"
med kryds som standard. Uden kryds skjules mailen. Ved første anmodning vises linket
med "Kopiér link", fordi kunden først ser anmodningen, når rådgiveren selv giver dem
linket. Knappen hedder "Opret uden mail" (første gang) eller "Gem ændringen"
(opdatering). Valget gemmes i kladden (`draft.sendMail`) og nulstilles efter
afsendelse. Anmodningen og dens historik får `noMail`, loggen siger "Anmodning
oprettet uden mail til …", og en opdatering uden mail står som "Anmodningen er ændret
uden mail til kunden: tilføjet …". Test: `nomail.js da|en` (scratchpad for session
2e448e6b, mappen `ob`).

## Kunden svarer på spørgsmål til materialet (7. oktober)

Når rådgiveren stiller et spørgsmål til et punkt (`CW.reject`, status `rejected`), står det ikke længere som en rød fejl i kundens portal.

- **Oversigten.** Rækken har et blåt "!" (`PortalAskMark`, `.cwp-ask`), teksten "Mette spørger: …" og knappen "Svar". Skærmlæsere hører "Spørgsmål fra Mette".
- **Punktets side.** Spørgsmålet står i en rolig blå boks med svarfeltet (`PortalQuestion`, `.cwp-question`). Et svar alene er nok, og knappen hedder så "Send svar". Kunden kan også tilføje en fil. Filerne, der allerede er sendt, står stadig og gælder stadig: en ny fil lægges til og afløser ikke de gamle. Landefordelingen har sin egen "Send svar" i boksen, og et svar skrevet der følger med, hvis kunden i stedet gemmer skemaet.
- **Data.** `CW.answerItem(id, text, { by })` gemmer `answer` og `question` på punktet og sætter det til gennemgang igen: `received`, eller `noted` hvis punktet kun havde en bemærkning. Det rører ikke `note`/`noteKind`, så en hentet kilde ("Hentet fra e-conomic") står urørt.
  - `markReceived` gemmer også teksten som `answer`, når der sendes tekst efter et spørgsmål. Svaret følger punktet ved senere uploads, indtil der kommer et nyt spørgsmål.
  - `markNoted` nulstiller svaret.
  - Et svar kan ikke fortrydes som helhed (`csCanUndo`), for det ville også trække de tidligere filer tilbage.
  - Fjerner kunden den sidste fil, mens der står et spørgsmål eller et svar, bliver spørgsmålet eller svaret stående.
  - Et svar kun med fil bevarer de sendte filers bemærkning eller kilde.
  - `markReceived` overskriver ikke længere `noteKind` med `undefined`, når et kald sender nøglen uden værdi (det gjorde `finish` i portalen, så hentede periodetal mistede kilden ved en ekstra fil).
  - En fil med samme navn og størrelse som en, punktet allerede har, lægges ikke ind igen.
  - "Tag tilbage" fra revisor eller bank efter et spørgsmål sætter spørgsmålet og filerne tilbage i stedet for at nulstille punktet.
  - Landefordelingen kræver noget nyt efter et spørgsmål, og en fil fjernet i skemaet fjernes rigtigt, når kunden sender.
- **Rådgiveren.** Under punktet står "Dit spørgsmål: …" og "Kundens svar: …". Svarer rådgiveren i forhåndsvisningen, står det i historikken som "Rådgiveren svarede for kunden".
- **Test.** `ans_test.js` i scratchpad: 40/40 på dansk og engelsk, og ingen vandret scroll ved 375 px.

## Kundeside og Kundeflow: vælg rolle, Rådgiver eller Kunde (7. oktober)

Øverst i Kundeside og Kundeflow (demo) står vælgeren "Se som" med valgene Rådgiver og Kunde (`#cwp-pv-role`). Valget huskes i browseren (`localStorage` `kabul:flow-role`, læses med `portalFlowRole()`).

- **Rådgiver (standard).** Som før er det en forhåndsvisning. Kundens handlinger (`data-cust-act`) stoppes. Filer og svar gemmes på kundens vegne som rådgiverens.
- **Kunde.** Forhåndsvisningens spærre er slået fra, og portalen virker som for kunden. Svar, filer, "Har vi ikke", beskeder og "læst" gemmes som kundens, og historikken siger "Kunden …". Bjælken siger det.
  - Skærmrækken (Landingsside, Bruger, Crediwire) og demoknapperne på trinnet Bruger viser kun skærmene i begge roller.
- **Det, der kun er for rådgiveren, forsvinder med rollen Kunde.** Det gælder mail-afkrydsningen og "Skriv som rådgiver" i dialogen, noten om upload på kundens vegne og statusboksen "Kunden er ikke startet endnu" på Kundeside.
  - Alt det spørger `CW.isPreview()`. `setFlowRole` skifter spærren med det samme, før siden tegnes igen.
  - "Nyt" i dialogen følger også rollen (`useCsFreshThreads(asAdvisor)`).
- **Teknik.** `asAdvisor` i CustomerPortal styrer `CW.setPreview` og `pvHandlers`. WSCustomerPreview (workspace.jsx) slår ikke spærren til, når forhåndsvisningen åbner med rollen Kunde. Dens effekt kører efter portalens og ville ellers overskrive rollen.
- **Rettet samtidig.** Knappen "Svar" på et spørgsmål havde `data-cust-act`, så forhåndsvisningen stoppede den, og rådgiveren kunne ikke åbne punktet. Den har nu `data-act="answer"`.
- **Test.** `role_test.js` i scratchpad: 20/20 på dansk og engelsk. `ans_test.js` er stadig 40/40.

## Punktets historik: hvem gjorde hvad, med filer og tekster (7. oktober)

"Historik (n)" ved et punkt (`wsItemHistory`/`WSItemHistory` i workspace.jsx) viser nu
hver hændelse som "hvem gjorde hvad" og gemmer det, der var dengang:
"Filer uploadet af kunde: a.pdf, b.xlsx", "Spørgsmål stillet af Mette (EIFO): "…"",
"Svar fra kunde: "…"", "Kommentar fra kunde: "…"", "Godkendt af Mette (EIFO)",
"Godkendelse fortrudt af …" / "Spørgsmål trukket tilbage af …", "Fil fjernet af kunde:
x.pdf" (gennemstreget) og "Trukket tilbage af kunde". Filer, der stadig ligger på punktet,
kan hentes; lange filnavne og tekster er afkortet, og hele teksten står ved hover.
Rådgiveren hedder "{fornavn} ({org})". Loggen i case_state.js gemmer nu det, historikken
skal bruge: `answerItem` gemmer svaret, `removeFile` filnavnet, `resetItem` typen, og
rådgiverens upload til et godkendt punkt filnavnene. Ældre logrækker uden data vises
med det, der findes. Test: `hist.js da|en` (scratchpad for session 2e448e6b, mappen `ob`).

## Mine opgaver efter designet "Mine opgaver v8" (7. oktober)

Siden er bygget efter Claude Design-projektet "Mine opgaver" (fil `Mine opgaver v8.dc.html` og handoff-README). Den bruger prototypens eget designsystem, ikke Ant Design-tokens. Koden er i `src/portfolio.jsx`, og reglerne står som kommentar øverst i filen.

**Liste og visninger**
- **Rækkefølge.** Afventer din gennemgang, Ikke anmodet, Afventer kunden, Alt materiale godkendt, Afsluttet. Inden for hver gruppe står længste ventetid først.
- **Kolonner.** Kunde, Afventer (Dig/Kunden), Indhentning (status og linjer under den), Ventetid (med forklaring) og "Gå til sagen" plus en ···-menu.
- **Faner.** "Alle", "Afventer dig" og "Afventer kunden" er gemte filtre. "Gem som visning" laver en ny fane, og "Slet visning" fjerner en gemt fane (en lille tilføjelse til designet).
- **Filter.** Indhentning, Ventetid og Seneste påmindelse (skydere med to håndtag, 0–60+ dage), "Kun påmindede" og "Nyt siden sidst".
- **Søgning.** Den dækker navn, CVR og sagsnummer, ignorerer filtre og viser også afsluttede sager. `/` fokuserer søgefeltet.

**Handlinger**
- **Påmindelse.** Den vises ved Afventer kunden, ventetid på mindst 14 dage og ingen påmindelse de seneste 7 dage.
  - Påmindelsen står som sendt med det samme, men gemmes først efter 6 sekunder, så "Fortryd" virker for alvor. Timeren holder pause, mens musen eller fokus er på beskeden.
  - Forlader man siden eller genindlæser inden da, sendes den.
  - Den gemmes som på Dataanmodninger og i sagen (`DATA.remindCase` / `DATA.remindersFor`), så de tre steder er enige.
- **Afslut sag.** Det kræver en årsag og kan fortrydes i toasten. En afsluttet sag står som lukket på Dataanmodninger (`requestLock` i data.js læser `kabul:tasks`). ···-menuen har også "Flyt sagen til" som før.

**Data**
- **Nordhavn (sag 1)** udledes levende af CW: anmodning, `progress()` (godkendt, til gennemgang, spørgsmål), samtalen, uploads og påmindelser i historikken.
- **De øvrige sager** har faste tal i `DATA.CASES[].collect` (data.js). Designets ekstra sager er tilføjet som Mettes (id 12–22).
- **Sager uden `collect`** (fra Ny sag-guiden, eller en kollegas sag, der er flyttet til dig) følger anmodningen på Dataanmodninger og sagens fase.
- **Det, rådgiveren gør i listen,** gemmes i `localStorage` `kabul:tasks`: set, påmindet, afsluttet og gemte visninger. "Nulstil demo" rydder det.
- **Nyt siden sidst** ryddes, når sagen åbnes. Det sker via `cw-route-changed`, så det gælder uanset hvorfra sagen åbnes.
- **Menuens tal** ved "Mine opgaver" (shell.jsx) er det samme som fanen "Afventer dig" (`window.cwTasksAwaitingMe`).

**Andet**
- **Engelsk.** Tre ord har en anden oversættelse andre steder i appen. Siden bruger sine egne (`TASK_EN` i portfolio.jsx): "Waiting on", "Customer" og "Go to case".
- **Smal skærm.** Under 1080 px står hver sag som et kort, fordi sidebjælken tager 232 px.
- **Ikke med fra designet.** Demo-punkterne i menuen ("Demo: kunden uploader en fil" og "Demo: du godkender en fil") var kun til designets prototype.
- **Test.** `tasks_test.js` i scratchpad: 45/45 på dansk og engelsk og ved 1024 og 390 px. Den sidste runde var en blind gennemgang, og fundene er rettet.

## "Spørg kunden" om det hentede bliver et punkt i anmodningen (7. oktober)

Afløser "Spørg kunden" → dialogen fra tidligere i dag.
- I "Anmod om materiale" står det, der er hentet automatisk (årsrapporterne fra CVR og de
  offentlige kilder: stamdata, branche og marked, produktbeskrivelse), i folden "Hentet
  automatisk (n)" med "Hentet automatisk fra {kilde} · dato" og knapperne "Spørg kunden"
  og "Bed om ny version". "Ligger allerede på sagen" har nu kun resten.
- "Spørg kunden" åbner en formular: spørgsmål og kategori (de fire kategorier eller
  "Andet" = Øvrigt; forvalgt er punktets egen). "Tilføj spørgsmålet" laver et eget punkt
  "Spørgsmål om {punkt}" (`CW.addCustomItem(label, cat, { question, about })`), som er
  valgt i anmodningen og viser spørgsmålet under titlen.
- Når anmodningen eller opdateringen sendes (med eller uden mail), får kunden punktet som
  et spørgsmål fra rådgiveren (`sendRequest` sætter status 'rejected' med spørgsmålet som
  `reviewNote` og logger det). Kunden ser "Mette spørger: …" og "Svar" og kan svare med
  tekst eller fil; svaret går til gennemgang som andre punkter.
- "Spørg kunden" ved dokumenterne under Materiale på sagen åbner anmodningen med
  formularen klar for det dokument (vises nu også før anmodningen er sendt).
- Dialogens "Handler om → Offentlige data" findes stadig til almindelige beskeder.
- Test: `askitem.js da|en` (scratchpad for session 2e448e6b, mappen `ob`). `askpub.js`
  er forældet (testede den gamle vej via dialogen).
