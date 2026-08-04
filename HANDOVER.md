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

Prototypen har tre valg i forbindelsesdialogen: Dit abonnement (lokalt), Claude
(API-nøgle), ChatGPT (API-nøgle).

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

## Hvad der mangler

Prioriteret. Punkt 8 var i gang da vi stoppede.

8. **AI-mærkning skal overleve redigering.** `tpl-draft` fjernes ved første
   tastetryk i blokken (`handleInput` i memo.jsx), og tekst indsat fra chatten
   mærkes aldrig. Kreditkontrol kaldte det en tilsynsrisiko: man kan ikke bagefter
   se hvad der er AI-skrevet og hvad rådgiveren selv står inde for.
9. **Attrapsignaler.** De 68 procent i sektionsoversigten er en hardkodet streng
   (memo.jsx, `<span className="tag">68%</span>`). Statusprikkerne og tjeklisten
   med faste grønne flueben er også hardkodede. De skal beregnes af antal
   uudfyldte felter, uafstemte tal og døde kildehenvisninger, ellers lyver
   værktøjet om hvor langt sagen er.
10. **Knapper der lyver**: knapper der ikke gør noget uden at forklare hvorfor.
11. **Afsnitsassistenten er svær at få øje på.**
12. **Én kilde til stamdata.** Bilagslisten matcher ikke sagen.
13. **Ét datasæt for facilitet, beløb og løbetid.** Står i fritekst tre steder og
    afviger allerede: totalrækken er hardkodet til 100 procent mens delene giver
    99, Bilag 1 angiver samme facilitet både som 2,2 og som 2,0 plus 2,5, og
    løbetiden står som 12 måneder tre steder mens ansøgningen siger 30.
14. **Indstillingsboks på side 1.** Komitémedlemmet har ti minutter og kan ikke se
    hvad der indstilles uden at læse elleve afsnit. Nærmest gratis når 13 er lavet.

## Udestående som ikke er kode

**De ti kildedokumenter modsiger stadig hinanden på detaljeniveau.** En revision
fandt 32 uoverensstemmelser: samme selskab med tre CVR-numre, anpartshaverlånet
med fire rentesatser, GE Vernova-ordren med fire numre og kontraktværdier.
Hovedtallene er rene. Reparationen blev sat i gang men afbrudt da sessionen
sluttede. Kan genoptages med workflow-scriptet
`repair-case-documents-wf_e49d5f55-522.js`, som indeholder et kanonisk
detaljeark der afgør hver konflikt.

**En OpenAI-nøgle blev delt i klartekst i samtalen 4. august.** Jesper skal
trække den tilbage på platform.openai.com/api-keys hvis det ikke allerede er sket.

## Konventioner

- Dansk i alt brugervendt indhold. Aldrig lange tankestreger.
- Firmanavnet staves Crediwire med lille w.
- Commit-beskeder og PR'er på engelsk.
- Ingen push eller PR uden at Jesper beder om det.
- Bump versionsnummeret i `index.html` når en fil ændres, ellers cacher browseren.
- Skriv aldrig `.jsx`-filer med PowerShells `Set-Content -Encoding UTF8`. Den
  læser UTF-8 som ANSI og ødelægger æøå. Brug `[System.IO.File]::WriteAllText`
  med `UTF8Encoding($false)`, eller Edit-værktøjet.
