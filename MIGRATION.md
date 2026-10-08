# Migration til Vue 3 + ant-design-vue 3.2.13

Prototypen (`credit-model`) er flyttet fra React 18 (UMD + Babel i browseren, ingen build) til
Vue 3 + ant-design-vue 3.2.13, CrediWires designsystem fra frontend-app. Reglerne og beslutningerne
står i [MIGRATION_CONTRACT.md](MIGRATION_CONTRACT.md); denne note beskriver resultatet.

> **Status:** klar til gennemgang (8. oktober 2026). Alle skærme er migreret, også den indbyggede memo-editor, og
> resultatet er kontrolleret mod originalen (se "Udførte checks"). Branchen findes kun lokalt; intet er pushet.

## Rettet efter gennemgangen (8. oktober)

Migrationens åbne spørgsmål er afgjort inden for Jespers ramme: en ændring laves, når den retter en reel fejl,
holder sig til Vue 3 og ant-design-vue og ikke tilføjer nye funktioner. Rettet:

- **Sikkerhed:** memoets rensning af AI-svar og indsat HTML (`cleanHtml`) fortolker nu teksten i et tomt
  dokument, så indsat kode ikke kan køre og læse AI-nøglerne. Samme fejl findes i den kørende prototype.
- **Indsæt fra Excel og Word:** udklipsholderens skjulte stilark kommer ikke længere med som synlig tekst.
- **Memo:** "Nulstil afsnit" kører ikke igen, når afsnittet tegnes forfra (før kunne det slette tekst);
  "+" og "Skriv med AI" vises igen kun i det afsnit, man arbejder i; "Indstillingen i hovedtræk" har
  tabeltitlens størrelse.
- **Kontrast (WCAG 2.1 AA):** sekundær tekst, pladsholdere, tomme lister og ventende trin er mørkere i
  temaet; advarsler står i normal tekstfarve med et gult ikon; Trustpilot-stjernerne er grå; grafen i
  Regnskab har igen prototypens farveroller.
- **Tastatur og skærmlæsere:** hovedmenuen er igen en navigation med knapper; tabeloverskrifterne i
  Kontomapping og Regnskab står fast som én tabel; "Gem note" på afslaget smider ikke fokus; noteknappen
  i Sagen vises igen som i prototypen.
- **Dialoger:** seks lange dialoger holder titel og knapper fast og ruller kun indholdet, som prototypen.
- **Øvrigt:** svarfristen i Ny sag tager imod i dag og frem som prototypen; beskeder med tonen "danger"
  vises som fejl; det valgte demotrin i portalen er tydeligt; SheetJS er opgraderet til 0.20.3 (to kendte
  sårbarheder ved læsning af filer).

Resten er gennemgået og beholdt; det står nedenfor med "Nej (afgjort)". To ting kræver en beslutning uden for
migrationen: brandfarvernes kontrast (links, fejltekst og grønne flueben) og oprydningen i Cloudflare (se
"Udgivelse på Cloudflare Pages").

## Sådan startes det

```powershell
npm install            # første gang (låste versioner, se package.json)
npm run build          # bygger appen til dist/
node devserver.js      # serverer dist/ + den lokale AI-bro på http://localhost:8080/
```

Udvikling med hot reload (devserver.js skal køre for AI-broen og gem af prompter):

```powershell
node devserver.js                     # terminal 1 (PORT=8080 som standard)
npm run dev                           # terminal 2: Vite på http://localhost:5173/
# anden port til devserver: $env:CW_API_PORT=8188; npm run dev
```

Kontrol: `npm run lint` (ESLint 10 + eslint-plugin-vue) og `npm run build`. Node 20.19+, 22.13+ eller 24+
(`engines` i `package.json`; Cloudflare læser `.node-version`).

Bemærk: `prompts/*.md` og `data/*.xlsx` ligger fortsat i roden; bygget kopierer dem til `dist/`, og
devserveren serverer dem live fra roden, så en gemt prompt virker uden nyt build.

## Udgivelse på Cloudflare Pages

Antd-udgaven er udgivet 8. oktober 2026 på `main` (produktionen på credit-model.pages.dev). Det gamle design
ligger som backup på branchen `credit-model-back-up-old-design`, som Pages også udgiver som forhåndsvisning.

Pages-projektet bygger stadig med de gamle indstillinger: `npm run build`, og repoets rod udgives. Derfor
lægger `scripts/pages-root.mjs` det byggede (`dist/`) oven i roden på Cloudflares byggeserver (miljøvariablen
`CF_PAGES`) og fjerner `node_modules`; lokalt gør scriptet ingenting. Node-versionen (22.16.0) læses fra
`.node-version`. Den lokale AI-bro og "Gem" i Prompt-værkstedet virker kun lokalt med `devserver.js`, som før.

Anbefalet oprydning i Cloudflare (Settings):

1. General → Enable access policy, så forhåndsvisningerne (også backuppen) kræver login som produktionen.
2. Builds & deployments → Build configuration: output-mappe `dist`. Fjern derefter `scripts/pages-root.mjs` og
   `&& node scripts/pages-root.mjs` fra `build` i `package.json`.
3. Fortryd om nødvendigt: Deployments → den seneste udgave af det gamle design → Rollback.

## Teknisk opbygning

| Del | Valg |
|---|---|
| Framework | Vue 3.5.43 (`<script setup>`, JavaScript), Vite 8.3.3 |
| UI-bibliotek | ant-design-vue **3.2.13** (som produktionen), @ant-design/icons-vue 6.1.0, global registrering (`app.use(Antd)`) |
| Tema | `ant-design-vue/dist/antd.less` + Less-variabler i `vite.config.mjs`: Source Sans Pro, radius 4 px, h1 30 px, kort- og modaltitler 20 px, hvidt sidehoved 56 px; primærfarve antd's `#1890ff`; af hensyn til kontrasten er sekundær tekst, pladsholdere og ventende trin 55 % sort og Trustpilot-stjernerne grå |
| Sprog | `t('dansk nøgle')` som før; ordbøgerne i `src/i18n/dict` (samme indhold og rækkefølge som den gamle `i18n_dictionaries.js`); `a-config-provider` med da_DK/en_US |
| Forretningslogik | `src/domain/` (se nedenfor) |
| Navigation | Samme rutestreng i `localStorage.cw_route` (`src/composables/useNavigation.js`) |
| Tilstand | `window.CW` (uændret), Vue følger den via `useCaseVersion()` |
| Excel | SheetJS 0.20.3 fra cdn.sheetjs.com, låst med `integrity` (SRI) i `index.html`. Prototypen brugte 0.18.5 fra cdnjs, som har to kendte sårbarheder ved læsning af filer (CVE-2023-30533 og CVE-2024-22363); "Importér budget" læser en fil, brugeren vælger |

### Forretningslogikken er flyttet, ikke omskrevet

- `src/domain/{data,case_state,case_facts,case_documents,mapping,ai}.js` og `src/i18n/i18n.js` er de
  gamle filer **byte-identiske** bortset fra tilføjede `export`-linjer. Eneste undtagelse:
  `case_state.js` har mistet sine to React-hooks (`useCase`, `useDialog`), og `toast`/`confirm` tegnes nu
  med ant-design-vue (`src/services/feedback.js`, `src/components/common/ConfirmDialog.vue`) med
  uændrede signaturer.
- Logik, der lå i .jsx-filerne, er flyttet ordret til `src/domain/<område>` (fx `tasks.js`,
  `financials/`, `workspace/`). Opstarts-effekter og `window`-providers (`CW_EXPORT_DOCS`,
  `CW_MEMO_STATUS`, `CW_SUBMIT_READY` m.fl.) indlæses af `src/bootstrap.js` i samme rækkefølge som
  den gamle `index.html`.
- Én undtagelse fra det ordrette, godkendt 8. oktober: `cleanHtml` i `src/domain/memo/memoAi.js` er rettet
  to steder (se Credit memo nedenfor). Fremmed HTML fortolkes i et tomt, inaktivt dokument
  (`document.implementation.createHTMLDocument('')`), og `<style>`, `<title>` og `<script>` fjernes med indhold.
- `window.CW`, `window.DATA`, `window.AI` m.fl. findes stadig: domænefilerne læser hinanden den vej.

## Komponentmapping

| Prototype | ant-design-vue 3.2.13 |
|---|---|
| Egne knapper (`.btn*`, `.icon-btn`) | `a-button` (primary/default/link/text, `danger`, `#icon`) |
| Sidebjælke og menu | `a-layout-sider` + `a-menu mode="inline"` (punkterne er knapper i en navigation); under 1000 px `a-drawer` |
| Sidehoved (Topbar) | `a-layout-header` + `a-breadcrumb` (under 1000 px på to linjer, som prototypen), sagssøgning `a-auto-complete`, klokke `a-popover` + `a-badge` + `a-list`, hjælp `a-modal` + `a-collapse` |
| Brugermenu | `a-dropdown` + `a-menu` (+ `useMenuKeyboard`) |
| CW.toast | `notification` nederst til højre (+ usynlig levende region) |
| CW.confirm | `a-modal` (`ConfirmDialog.vue`) |
| ListTabs | `a-tabs` (+ `useTabsKeyboard`, som også giver fanelisten sit navn) |
| CWSeg | `a-radio-group option-type="button"` (Segmented findes ikke i 3.2.13) |
| CWFold | `a-collapse` ghost (+ `useCollapseKeyboard` og `collapseExpandIcon`) |
| CWStatus | `a-typography-text` |
| FilterDropdown | `a-select` navngivet med `a-form-item :label` + `html-for`/`id` |
| LanguageSwitcher | `LanguageSwitcher.vue`: `a-button-group` med to `a-button` (`aria-pressed`, det valgte sprog som `primary ghost`) i `role="group"`, som prototypens to knapper |
| AiBadge | `a-tag` + `RobotOutlined` + `a-tooltip` |
| Mine opgaver | `a-table`, `a-tabs`, `a-input`, `a-popover` (filter) med `a-checkbox` og `a-slider range`, `a-dropdown`, `a-modal`, `notification` med fortryd |
| Dataanmodninger | `a-tabs`, rækker som `a-list` i `a-card`, detaljer i `a-modal` (572), ansvarlig som `a-select`, aktivitet i `a-collapse` |
| Porteføljeanalyse | `a-table` med antd's sortering (+ `aria-sort` og fokusérbare kolonneoverskrifter), filtre som `a-select`, egne kriterier i `a-collapse` med `a-input-number`/`a-select`, chips som `a-tag closable` |
| Prompt-værksted | filer som lodrette `a-tabs`, felter som `a-textarea` i `a-form`, "Prøv" i `a-card` med `a-spin`/`a-alert`, historik i `a-collapse` + `a-list` |
| AI-indstillinger (MemoAI.AiSettingsDialog) | `AiSettingsDialog.vue`: `a-modal` (572), udbydere som `a-radio-group`, motorer som `a-radio`, `a-form-item`, `a-input`, `a-select`, "Avanceret" i `a-collapse`, beskeder som `a-alert`; `useAiStatus.js` |
| Virksomheden (sektioner) | `FinSection.vue` (overskrift + `a-card`-indhold), AI-tekster med `AiBadge`, `a-spin` ved kørsel, stamdata som `a-descriptions`, ejere som `a-list`, Trustpilot med `a-rate` og `a-progress`, dialoger som `a-modal` (572) |
| Regnskab | `a-table` (fast overskrift: eget `<thead>` via `components`, faste rækker, udfoldelige kvartaler), redigerbare celler (`a-input` i cellen), noter i `a-popover`, enhed som `a-radio-group`, budget-import/-eksport (`a-button` + skjult filfelt), prototypens SVG-graf som domænekomponent (`FinChart.vue`) med serier som `a-checkbox` |
| Sagen: sidehoved og faner | h1-række (`a-row`/`a-space`), ansvarlig `a-select`, flere handlinger `a-dropdown` (+ `useMenuKeyboard`), faner `a-tabs` (+ `useTabsKeyboard`, scroll-hukommelse), fasekort med deaktiverede `a-steps`, tom sag `a-empty` + `a-descriptions`, afslag/spring over som `a-modal` |
| Sagen: Overblik | kort som `a-card`, materialerækker som `a-list` med status-ikoner (icons-vue), spørg/afvis/påmind som `a-modal`/`a-form`, intern note i `a-popover`, aktivitet `a-list`, offentlige kilder `a-list`, samtalen med kunden (`CustomerConversation.vue`) |
| Anmod om materiale | `a-modal` (720) med valg- og forhåndsvisningstrin, kategorier som `a-select`, filer som `a-upload` (+ `useUploadButton`), svarfrist `a-date-picker`, mail som `a-form` (`MailComposer.vue`) |
| Kundeside/Kundeflow | `a-drawer` med kundens portal (`CustomerPortalView` med `preview`) |
| Indstilling | parathed som `a-list` med status-ikoner, årsag `a-textarea` + validering i `a-form-item`, kvittering, træk tilbage via `CW.confirm` |
| Dokumenter | grupperede rækker (`a-list`-mønster med egne nøgler), søg `a-input`, sortering `a-select`, upload `a-upload` (+ `useUploadButton`) og slip-zone med `a-alert`-hint, slettede/tidligere versioner i `a-collapse`, den slukkede fremviser som `a-card` + `a-radio-group` |
| Credit memo (Copilot) | grupper som `a-list`, hent-knapper `a-button`, `AiBadge`, vejledning som `a-alert`/`a-typography` |
| Kontomapping | `a-table` med to overskriftsbånd, sum-/overskriftsrækker og udfoldelige måneder, valg med `a-checkbox` (Shift-område), kategoripanel `a-list`, filtre `a-radio-group`/`a-select` |
| Ny sag | `a-modal` (720, topjusteret) med tre trin, virksomhedssøgning `a-input` + `a-list`, sagstype `a-radio` med beskrivelse, beløb `a-input` (+ `ncParseAmount`), svarfrist `a-date-picker`, anbefalet punkt som `a-alert` (alertdialog), mailvisning i `a-collapse` |
| Kundens portal | sidehoved, forhåndsvisningsbjælke `a-alert` + `a-select`, trin `a-steps` (responsive), punkter som `a-list`, upload `a-upload-dragger`, spørgsmål `a-textarea`, dialoger `a-modal` (572), status med `a-steps` (progress-dot); på telefon `a-config-provider component-size="large"` |
| Kundens onboarding | bruger-trin som `a-form`, Crediwire-login (`a-form`, `a-input-password`), ERP-opsætning (`a-radio`, `a-select`, `a-date-picker picker="month"`), ERP-dialog `a-modal` med `a-timeline`, demo-bjælke `a-radio-group`, forhåndsvisningsnote `a-alert` |
| Kundens formularer | samtale (`a-comment`-liste, `a-textarea`, `a-select` med grupper, `a-checkbox`), "Har vi ikke" (`a-radio-group`, `a-textarea`, `a-upload`), salg pr. land (`a-auto-complete`, `a-input` med %, `a-collapse`) |
| Credit memo (indbygget editor) | `MemoEditor.vue`: afsnittene er redigerbare blokke (`contenteditable`) med dokumentstil fra `memo-document.less`, værktøjslinje med `a-button`/`a-dropdown`/`a-tooltip`, afsnitsliste og faktaboks (`a-descriptions`), kommentarer i en rail med `a-tabs` (smal skærm: `a-drawer`) med `a-comment`, `a-collapse` og `a-badge`, AI-assistent og -chat med `a-card`, `a-alert` og `a-spin`, dialoger som `a-modal` (eksport, generering, kildeviser med radiogruppe), versionsbanner og nyt materiale som `a-alert` |

## Afvigelser og begrundelser

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Tweaks: accentfarve-knappen er fjernet | Strider mod designsystemets tema (primærfarven styres af temaet). Panelet vises kun i Claude Design-værten | Nej (afgjort) |
| Skrifttype Source Sans Pro i stedet for Inter/JetBrains Mono | Designsystemets skrift (frontend-app) | Nej (designstandard) |
| Skydernes håndtag i Mine opgavers filter får navnene "<filter>: fra" og "<filter>: til" efter tegning, som før | `a-slider` 3.2.13 sender ikke vc-slider's `ariaLabelGroupForHandles` videre | Nej (bevarer funktion; noteret) |
| Dropdown-menuer og faner har fået tastaturstyring (`useMenuKeyboard`, `useTabsKeyboard`) | antdv 3.2.13 mangler det; prototypen havde det | Nej (bevarer funktion) |
| Hovedmenuen er en navigation med knapper som prototypens: de fem punkter har `role="button"` og den aktuelle side `aria-current="page"`, listen har `role="none"`, og hvert punkt er et Tab-stop, der reagerer på Enter og Mellemrum (`AppSidebar.vue`). Piletaster er ikke tilføjet | antdv's inline-menu giver rollerne `menu`/`menuitem` (en programmenu med piletaster) og `tabindex="-1"`. Listens rolle kan ikke sættes med en prop i 3.2.13 og rettes i DOM'en, hver gang sidebjælken tegnes. axe's best practice-regel `aria-allowed-role` markerer `li` med knaprollen; skærmlæsere læser punkterne som knapper | Nej (bevarer funktion; noteret) |
| Fanelistens navn sættes af `useTabsKeyboard` på `[role=tablist]` | 3.2.13 lægger `aria-label` på den ydre div og har ingen prop til fanelisten; lille DOM-undtagelse ét sted | Nej (bevarer funktion; noteret) |
| Folde: Mellemrum folder (`useCollapseKeyboard`), og pilen er skjult for skærmlæsere (`collapseExpandIcon`) | `a-collapse` reagerer kun på Enter, og standardpilens `aria-label="right"` kom med i overskriftens navn | Nej (bevarer funktion) |
| Esc i en åben `a-select` i en dialog lukker kun listen (`useSelectEscape`) | 3.2.13 lader Esc boble videre og lukker dialogen | Nej (bevarer funktion) |
| Felter navngives med synlig etiket (`a-form-item` + `html-for`/`id`) i stedet for `aria-label` | `aria-label` på `a-select` når ikke frem til inputtet i 3.2.13. Antd's etiket-kolon står som i prototypens "Ansvarlig:" | Nej |
| Tema: h2 20 px og h3 16 px (h1 30 px) | antd's standard h2 (30 px) var lige så stor som sidetitlen; 20 px svarer til frontend-app's korttitler | Nej (designstandard) |
| Sekundær tekst, pladsholdere og tallene i ventende trin er 55 % sort (`text-color-secondary`, `input-placeholder-color` og `wait-icon-color` i `vite.config.mjs`) i stedet for antd's 45 % og lyse grå | antd's værdier giver 3,4:1 (sekundær tekst) og 1,8:1 (pladsholdere og ventende trin), under WCAG 2.1 AA for 14 px tekst; prototypens grå bestod. 55 % giver 4,7:1 mod hvid og 4,6:1 mod sidens grå baggrund. Bevidst afvigelse fra frontend-app, der har antd's grå. Deaktiverede kontroller beholder den lyse grå (de er undtaget fra kravet). AI-afsnittene i Virksomheden står fortsat i normal tekstfarve | Nej (tilgængelighed; noteret) |
| Prompt-værksted har fået `AppTopbar` | Under 1000 px er menuen en skuffe, der kun kan åbnes fra topbjælkens knap; prototypen havde en egen flydende knap | Nej (afgjort) |
| Porteføljeanalyse: `pct()` returnerer tekst, og skærmen farver negative tal | JSX kan ikke ligge i domænefilen; samme synlige resultat | Nej |
| Dataanmodninger: `openRequestCase` kalder `openCase` fra `useNavigation` i stedet for `window.cwOpenCase` | Samme funktion, porteret; den eneste ændrede linje i den flyttede logik | Nej |
| `memoCite.js` har en `eslint-disable no-control-regex` i filhovedet | Den ordrette regex fjerner skilletegnet U+0001; kroppen må ikke ændres | Nej (noteret) |
| Synligt tastaturfokus på faner, folde, knapper, links, afkrydsningsfelter og radioknapper (`src/styles/focus.less`: 2 px ring ved `:focus-visible` i primærfarvens mørkere trin `@primary-7`, så den også står over 3:1 på den grå baggrund; for felterne om etiketten). Tekstfelter og lister beholder antdv's kant og glød | antdv 3.2.13 viser intet eller næsten intet tastaturfokus der (WCAG 2.4.7): faner og folde ingen ring, tekst-, ikon- og linkknapper kun en svag farve- eller baggrundsændring, et afkrydset felt slet ingen. Prototypen havde en ring på alt med tastaturfokus. Reglerne rammer elementer og ARIA-roller (`button[type]`, `a[href]`, `[role=tab]`), ikke `.ant-*`-klasser | Nej (bevarer funktion; noteret) |
| Faner: kun den valgte fane er et Tab-stop (roving tabindex; er ingen valgt, fx under en søgning, den første), og fanepanelerne er ikke Tab-stop (`useTabsKeyboard`) | Som prototypens faner; antdv gjorde hver fane og det aktive panel til Tab-stop, og under en søgning kunne fanerne slet ikke nås | Nej (bevarer funktion) |
| Alle dialoger har `aria-modal="true"` via `wrap-props` | 3.2.13 sætter kun `role="dialog"`; prototypens dialoger havde `aria-modal` | Nej (bevarer funktion) |
| Upload-knapper: `a-upload`'s omslag er taget ud af Tab-rækkefølgen (`useUploadButton`) | 3.2.13 gør omslaget til et usynligt Tab-stop, der ignorerer Mellemrum; knappen indeni er den eneste kontrol, som før. `a-upload-dragger` (portalens slip-felt) er uændret | Nej (bevarer funktion; noteret) |
| Smal skærm (under 1000 px): menupanelet er en modal dialog som i prototypen (`role=dialog`, `aria-modal`, navnet Hovedmenu og egen lukkeknap "Luk menuen" øverst, hvor menuknappen stod; Tab bliver i panelet). Det lukker og flytter fokus som prototypen (Esc og lukkeknap → menuknappen; baggrund, sideskift, knap i panelet eller fokus, der forlader det → luk uden at flytte fokus), og det lukkede panel fjernes (`destroy-on-close`) | `a-drawer` i 3.2.13 sender hverken `role` eller `aria-*` videre og har en lukkeknap med `aria-label="Close"`, så dialogen er panelets indhold. Skuffen beholdt ellers usynlige Tab-stop og gav altid fokus til menuknappen | Nej (bevarer funktion) |
| En ny besked (`CW.toast`) får sin egen nøgle | antdv beholdt den forrige beskeds tid, så en erstattende besked kunne forsvinde efter et sekund | Nej (bevarer funktion) |
| Det indbyggede memo indlæses først, når fanen vises (`defineAsyncComponent`) | Kun builtin-tilstand bruger det | Nej |
| `WSCustomerStatus` (rådgiverens kundestatus uden portalen) er ikke porteret | Uopnåelig: sagens forhåndsvisning bruger altid portalen (`wsPortalHasPreview` var altid sand) | Nej (død kode) |
| Teksten i tomme lister og søgninger uden træf (`a-empty`, sagssøgningens og landelistens "Ingen … matcher") står som sekundær tekst via slots (`#description`, `#notFoundContent`) med `a-typography-text type="secondary"` | antd tegner dem i den deaktiverede farve (1,84:1), men de er information og ikke deaktiverede kontroller. Afviger fra frontend-app | Nej (tilgængelighed; noteret) |
| Ændringer i andre faner opdaterer ikke visningen (`storage`) | Samme adfærd som prototypen (paritet) | Nej |
| Dialogerne (`useDialogFocus`, én gang i `App.vue`): fokus på dialogens første element, når den åbner, og Tab springer antdv's usynlige fokusvagter over; krydset hedder "Luk" på dansk; Esc og Tab virker også, når det fokuserede element er forsvundet (fx efter "Fjern") | antdv 3.2.13 satte fokus på en usynlig vagt uden navn, havde to ekstra Tab-stop i hver dialog, kalder krydset "Close" og hører kun tasterne inde i dialogen. Prototypens `CW.useDialog` gav fokus til første element og lyttede på hele dokumentet | Nej (bevarer funktion) |
| Seks dialoger med lister, der kan vokse (Ny sag, Anmod om materiale, Generér memoet, en dataanmodnings detaljer, "Få hjælp fra revisor eller bank" og "Send en anden fil"), holder titel og knapper fast og lader kun indholdet rulle, som prototypen (antdv's `body-style` med `src/components/common/dialogBody.js`: højst `calc(100vh - 232px)`). Et nyt trin starter øverst. Små forskelle: på telefon kan dialogen rulle 8 px som helhed, en titel på to linjer kan skubbe knapperne lidt ned, og en åben liste eller kalender følger ikke med, når indholdet rulles med musehjulet | Prototypens adfærd med designsystemets egen dokumenterede prop, uden CSS på antdv's klasser | Nej |
| Lister og tabeller har antd's standardafstande, så rækkerne er højere (fx ca. 100 px mod 80 px i Mine opgaver), og der står færre rækker på skærmen | Designsystemets størrelser | Nej (designstandard) |
| Tab bliver i klokkens panel og i menupanelet på smal skærm (`useFocusTrap`, porteret fra `CW.useDialog`) | antdv's popover og skuffe holder ikke fokus inde, som modalerne gør; prototypens paneler gjorde | Nej (bevarer funktion) |
| Klokken: overskriften med "Markér som læst" står i panelets indhold med en `a-divider`, ikke i popoverens titel. Tallet på klokken er skjult for skærmlæsere (`aria-hidden` sat på badge-tallet) | Knappen skal være en del af dialogen og have fokus, når panelet åbner, som før. Tallet står allerede i knappens navn; `a-badge` har ingen prop til at skjule det | Nej (bevarer funktion; noteret) |
| Sagssøgningen (`a-auto-complete`) åbner, når feltet får fokus, Esc lukker listen og beholder teksten, og "Ryd søgning" er en `a-button` i feltets suffix | Som prototypen; antdv åbner kun ved klik og skrivning, gør feltet til et søgefelt, som browseren tømmer ved Esc, og `allow-clear` virker ikke på et input inde i `a-auto-complete`. Punkternes `label` er deres navn for skærmlæsere (antdv's skjulte liste viste ellers kun sagens id) | Nej (bevarer funktion) |
| En besked (`CW.toast`), som fokus senere lander under, flyttes op i hjørnet øverst til højre (64 px, under sidehovedet) | Som prototypen (WCAG 2.4.11). antdv kan ikke flytte en vist besked, så den lukkes og vises igen dér med den tid, den har tilbage | Nej (bevarer funktion) |
| Et klik på det aktive sprog i sprogvælgeren genindlæser ikke siden | Prototypens adfærd var en kendt fejl; en valgt radioknap sender ingen ændring | Nej (prototypefejl ikke genskabt) |
| En besked med tonen "danger" (`CW.toast`, fx "AI kunne ikke køre" og "Kunne ikke gemme") vises som fejl med rødt ikon | Prototypen viste den som succes, en kendt fejl: begge beskeder er fejl | Nej (prototypefejl ikke genskabt) |
| Advarsler, der i prototypen stod i mørk ravfarve, står i normal tekstfarve med et gult advarselsikon foran (Ny sags beløb, svarfristen i "Anmod om materiale", salg pr. land, Regnskabs kommentarantal, "Ikke mappet", "Ændringer er ikke gemt" og memoets AI-assistent); "redigeret" i "Generér memoet" er et neutralt mærke | antd's advarselsfarve har kun 1,9:1 som tekst; ikonet bærer farven, ordene bærer betydningen | Nej |
| SheetJS er opgraderet fra 0.18.5 til 0.20.3 og hentes fra SheetJS' eget CDN med integritetstjek | Kendte sårbarheder ved læsning af filer. Resultaterne er de samme (golden I/O og Excel ind og ud i browseren, også .xls). Ændres filen på CDN'et, blokeres den, og appen viser sine eksisterende beskeder | Nej |
| Mine opgaver beholder tabellen i alle bredder; under ca. 650 px (fx 200 % zoom) ruller tabellen vandret i sin egen ramme (`a-table :scroll`) | Prototypen skiftede til kort under 1080 px. Et kortlayout ville være en anden gengivelse af samme data | Nej (afgjort) |
| Mine opgaver og portalens demobjælke: popoverens Tab-rækkefølge (`usePopoverTabOut`: Tab fra sidste felt fortsætter efter knappen, Shift+Tab fra første tilbage til knappen), "Ventetid"-hjælpen som egen lille komponent (`TaskTip.vue`, Esc skjuler), filterantal i felternes navn (skjult tekst) og skalaens sidste mærke på én linje | Genskaber prototypens adfærd; antdv lægger popoveren sidst i dokumentet, og reaktiv tilstand i `a-table`'s headerCell-slot brød tabellen | Nej (bevarer funktion) |
| Prompt-værksted: "Hvilket punkt" navngives af en skjult etiket, fillisten har navnet Prompts, og pil op/ned skifter fil i den lodrette faneliste | `aria-label` på `a-select` når ikke inputtet i 3.2.13; prototypens filnavigation hed Prompts | Nej (bevarer funktion) |
| Hjælp: fasernes forklaringer er en `a-list` i stedet for en definitionsliste, og foldene har ikke `aria-controls` | `a-collapse` i 3.2.13 sætter ikke `aria-controls`; indhold og rækkefølge er de samme | Nej (noteret) |
| Tweaks-panelet er en fast `a-drawer` og kan ikke trækkes rundt | Panelet vises kun i Claude Design-værten; beskederne til værten er de samme | Nej (noteret) |

## Afvigelser pr. område

Tabellen ovenfor dækker det, der går igen på tværs af skærmene. Her er resten, skærm for skærm.
Afvigelser, der tidligere ventede på en beslutning, er gennemgået 8. oktober (se "Rettet efter gennemgangen");
"Nej (afgjort)" betyder, at afvigelsen er beholdt.

### Dataanmodninger

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Ansvarlig-feltets navn kommer fra den synlige etiket og er derfor "Ansvarlig :" med antd's kolon | `aria-label` på `a-select` når ikke frem til feltet i 3.2.13 | Nej (afgjort) |
| Hjælp på tekst, der ikke kan fokuseres (fanehjælp, kundens svarfrist, klokkeslæt i aktiviteten), er `a-tooltip`; knappernes `title` er bevaret | Designsystemets tooltip. På knapper giver `title` stadig beskrivelsen til skærmlæsere | Nej |
| Fanernes og panelernes id'er følger antdv (`cw-req-tab-<nøgle>`, `cw-req-panel-<nøgle>`) | Intet andet i appen bruger de gamle id'er | Nej |
| Detaljedialogen er 572 px bred (var 560) i antdv's standardposition, og statussætningen står øverst i indholdet | Kontraktens dialogstandard; dialogens navn er stadig virksomhedens navn | Nej |
| Rækkerne er `a-list` i et `a-card` med virksomhedens navn som linkknap; "Påmind alle" og Ansvarlig står ud for fanerne | Designsystemets mønstre | Nej |

### Porteføljeanalyse

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Kolonnebredderne er procenter pr. sprog, og tabellen er mindst 980 px (var 960). Afdeling og branche afkortes som før; et langt kundenavn, CVR-linjen og sagens status brydes over to linjer i stedet for at stå på én | antd's 14 px skrift og sorteringspile på alle kolonner passede ikke i prototypens procenter | Nej |
| Sortering med `a-table`'s egen sortering: kolonneoverskriften kan fokuseres (Enter/Mellemrum), har `aria-sort` og kolonnens titel som navn, i stedet for en knap i overskriften. Klikrækkefølgen er den samme | Designsystemets tabel | Nej (afgjort) |
| Tabellen har ingen `<caption>`; den navngives af en fokusérbar region "Kunder i porteføljen", og "n af N" står i kortets hjørne | `a-table` har ingen caption | Nej |
| Alle kriteriefelter har nu et navn (prototypen manglede nogle) | Etiketter med eksisterende ordbogsnøgler | Nej |
| Kriterietallene er `a-input-number`; komma er decimaltegn, og et tomt felt gemmes som før. Tallene står venstrestillet i normal skrift | Designsystemets talfelt | Nej |
| Chips er `a-tag closable`, "og/eller" er en tekstknap i en `a-divider`, filtrene står i en inline `a-form` med antd's kolon, og den tomme tilstand er `a-empty` | Designsystemets mønstre; tekster og funktion er de samme | Nej |

### Prompt-værksted

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Siden ruller med dokumentet | I prototypen kunne indhold under skærmkanten (Gem, Prøv, historik) ikke nås med musen (`overflow: hidden`). Appens almindelige sidelayout retter det | Nej (afgjort) |
| Fillisten er lodrette `a-tabs` i stedet for navigationsknapper; noten om, hvor Gem gemmer, står øverst i kortet | Punkter i `a-menu` kan ikke nås med Tab i 3.2.13; faner er designsystemets måde at skifte visning på | Nej |
| Filtitlen og "Prøv på Nordhavn" er overskrifter via `role="heading"` (niveau 2 og 3); filtitlen er 14 px halvfed (var 16 px) | antdv's overskrifter bestemmer både niveau og størrelse | Nej |
| Tekstfelter og stier står i designsystemets skrift (ikke monospace), og hjælpeteksterne står under felterne | Ingen egen skrift-CSS (kontrakten) | Nej |
| Tilstandene: `a-spin` mens der hentes, fejl som `a-alert` (læses op), resultatet i et `a-card`, den sendte prompt i skrivebeskyttede tekstfelter i stedet for `<pre>`, og ændringsprikken som `a-badge` | Standardkomponenter; tekster og betingelser er de samme | Nej |
| AI-indstillinger: udbyderne er en `a-radio-group` (ét Tab-stop, piletaster skifter som et klik), motorerne radioknapper, "Avanceret" en fold og beskeden et `a-alert`, der nu læses op. Dialogen åbner med fokus på den valgte udbyder (før: den første, "Dit abonnement"), og fokus går tilbage til knappen, der åbnede den | Kontraktens beslutninger om segmenterede valg, radioknapper og dialoger | Nej |
| Skifter man udbyder, mens "Hent modeller" henter, gemmes den automatisk valgte model hos den udbyder, der er valgt nu (før: hos den forrige) | React-hooks kunne ikke flyttes ordret; et kanttilfælde | Nej (noteret) |
| AI-statuslinjen følger også ændringer fra en anden fane | Statuslinjen og "Kør kladden" bruger nu samme `useAiStatus` og kan ikke være uenige | Nej |

### Virksomheden og Regnskab

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Grafens farver er temaets i prototypens roller: omsætning i primærfarven, bruttofortjeneste i dens lyse trin (`@primary-3`) og EBITDA i neutral grå (antd's grå 7 til søjlen og grå 8 til tallene). Budget er skraveret og fremskrevet stiplet i seriens egen farve, og prognosezonen er lys grå med en stiplet grå streg. Geometri, skala og etiketter er uændrede | Prototypen tegnede bevidst grafen i sine egne farver frem for designoverdragelsens navy og orange, og den orange tekst havde kun 3,5:1 kontrast. Nuancerne er antd's (fx `#1890ff` i stedet for prototypens `#1d4ed8`). Den lyseblå søjle har lav kontrast mod hvid (1,6:1; prototypen 2,6:1), men tallet står over søjlen | Nej |
| Kun brødtekstcellerne er farvetonede for realiseret og budget; overskrifterne har antdv's baggrund | Farvede overskrifter kræver, at antdv's overskriftsstil overskrives | Nej (afgjort) |
| Kommentarboksen er en `a-popover`; et nyt klik på kommentarknappen lukker den (før: den lukkede og åbnede igen) | antdv's klik-popover. Fokus, Enter, Esc og klik udenfor virker som før | Nej (afgjort) |
| "Importér budget" er en `a-button`, der åbner et skjult filfelt, som i prototypen, ikke en `a-upload` | `a-upload` giver et usynligt ekstra Tab-stop, der ikke reagerer på Mellemrum | Nej (afgjort) |
| Grafens serier vælges med `a-checkbox` med farveprøve i gruppen "Serier i grafen". Mangler omsætningen i alle årsrapporter, er Omsætning `aria-disabled` med forklaringen i en tooltip | antdv har ingen vippe-chip, og `a-checkable-tag` kan ikke fokuseres | Nej |
| Kommentarknappen ved en celle (24 px) dækker de sidste cifre i nabocellen, mens den vises (ved hover eller fokus på cellen) | antdv's mindste knap er 24 px; prototypens ikon var 16 px | Nej (noteret) |
| Enhedsvælgeren er en `a-radio-group` med knapper | Kontraktens beslutning om segmenterede valg | Nej |
| Advarslen om mapping og importbeskeden er stille `role="status"`-linjer, ikke `a-alert` | `a-alert` læses op med det samme (`role="alert"`); prototypen var høflig | Nej |
| Overskrifterne står fast ved rulning, når kvartalerne er foldet sammen (tabellens eget `<thead>`, én tabel); foldet ud ruller tabellen vandret med fast etiketkolonne. Tabellen tegnes forfra, når kvartalerne foldes ud eller sammen. Fordi overskrifterne nu tæller med i kolonnebredderne, er årskolonnerne lidt smallere og 2026E/2027B lidt bredere (fx 111 mod ca. 118 px og 212/196 mod ca. 202/185 px ved 1440 px); grafen følger tabellen | Som prototypen. antdv 3.2.13 fjerner ikke den vandrette rulning fra tabellens ramme igen, når kvartalerne foldes sammen, og i en ramme, der ruller, kan overskriften ikke stå fast | Nej |
| Tabellen bruger Source Sans Pro 14 px med tabeltal (var monospace 11,5-12 px); detaljepanelet bruger `a-statistic` og `a-descriptions`; "Sådan er tallene beregnet" er en fold | Designstandard frem for prototypens pixels | Nej |
| Virksomheden: AI-teksterne vises med en `a-spin` over teksten, mens de skrives, og Stamdata mens de hentes igen | Designsystemets indlæsningsmønster; status, `aria-busy` og deaktiverede knapper er de samme | Nej |
| Stamdata og bestyrelse er `a-descriptions`; ejere, bestyrelsesmedlemmer, ejerbog og anmeldelser er `a-list` | Designsystemets mønstre for nøgle/værdi og lister | Nej |
| Trustpilot: stjernerne er `a-rate` i neutral grå (`rate-star-color`: antd's grå 8, `#595959`, 7:1 mod hvid) som prototypens grå; fordelingen er `a-progress` i primærfarven (var grå) | antd's guld havde 1,4:1 mod hvid, og antallet af stjerner vises kun som stjerner. Ved søjlerne står antallet som tal | Nej |
| Dialogerne er 572 px brede (var 480, 560 og 500); id'erne `fin-upload-product`, `fin-product-doc` og `fin-board` er bevaret | Kontraktens dialogstandard | Nej |
| Ikonknapper viser deres navn i en `a-tooltip`; kopiknappen viser "Kopieret" i 1,4 sekunder og beholder fokus (prototypen mistede det) | Designsystemets tooltip | Nej |

### Kontomapping

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Den faste tabeloverskrift er tabellens eget `<thead>` med `position: sticky` (antd's egne værdier for en fast overskrift) via den dokumenterede `components`-prop, så overskrift og krop er én tabel, og cellerne er knyttet til kolonneoverskrifterne (gælder også Regnskab). Tabellen har `table-layout="fixed"`, så kolonnerne har samme bredder som før | antdv's `sticky` delte tabellen i to og satte stiltiende fast layout | Nej |
| Valgte og ikke-gemte rækker er ikke farvetonede | Afkrydsningsfeltet viser valget, og ikonet "Ændret, ikke gemt" og "Gem ændringer (n)" viser ændringerne | Nej |
| Metodefilteret og undergrupperne er `a-radio-group`-knapper. Et klik på den valgte viser stadig alle, men Mellemrum på den valgte gør intet (piletasterne når "Alle") | Kontraktens beslutning om segmenterede valg | Nej |
| Etiketterne i værktøjslinjen står ved siden af felterne; antal og "Flyt hertil" står i listepunktets højre side | Designsystemets standarder; panelet på 380 px blev ellers ulæseligt | Nej |

### Ny sag

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Svarfristen (`a-date-picker`) afviser datoer før i dag, både i kalenderen og når de skrives; i dag og frem kan vælges, som prototypens validering (`CW.isPast`). Prototypens kalender gråede dagene før næste arbejdsdag ud (`min`), men tog imod dem, når de blev skrevet. Beskeden "Svarfristen ligger i fortiden" kan i praksis ikke nås | Datovælgeren bruger én regel til både kalender og tekst; valideringens egen regel giver præcis de datoer, prototypen godkendte | Nej (bevarer funktion) |
| Svarfristens `aria-required`, `aria-invalid` og `aria-describedby` sættes på feltet via en template-ref | 3.2.13 sender ikke `aria-*` videre fra `a-date-picker` | Nej |
| Esc og Tab, når det fokuserede element er forsvundet (fx efter "Behold" eller et valgt resultat), håndteres af guiden selv | Port af `CW.useDialog`; antdv hører kun taster inde i dialogen | Nej |
| Efter "Opret sag" og "Åbn sagen" får den nye sides h1 fokus efter ca. 300 ms (før ca. 60 ms) | Samme slutresultat | Nej |
| Sagstypen er almindelige radioknapper med beskrivelse, den valgte virksomhed et lille `a-card` med "Skift", og søgeresultaterne en liste af linkknapper i gruppen "Søgeresultater" | antdv-mønstre; tekster, id'er og fokus er de samme | Nej |
| Dialogen står 100 px fra toppen (var 6 % af højden); titel og knapper står fast, og kun indholdet ruller, som før | antdv's standard; dialogen hopper ikke mellem trinene | Nej |

### Sagen

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Mailen er en lodret `a-form` (Emne over feltet, teksten i et tekstfelt) i stedet for en boks, der ligner en mailklient | antdv har ikke noget tilsvarende; tekster og regler er de samme | Nej |
| Statusikonerne er antdv-ikoner (flueben, udråbstegn, ur, minus) i stedet for tegnede prikker | antdv-ikoner frem for egne SVG'er; teksten, der læses op, er den samme | Nej |
| Kildehenvisningen er en lille rund `a-button` | Designsystemet; funktionen er stadig slået fra | Nej |
| Tom sag: fakta står én pr. række i `a-descriptions` (var tre kolonner) | Med tre kolonner blev ord brudt midt i | Nej |
| Svarfristen i "Anmod om materiale" er en `a-date-picker` (DD-MM-YYYY) med fortidige datoer slået fra; den gemte værdi er den samme | Designsystemets datofelt | Nej |
| To knapper, som prototypen kun markerede med `aria-disabled` (Send påmindelse, Send spørgsmål), er rigtigt deaktiverede. "Gem note" på afslaget er stadig kun markeret med `aria-disabled`, som før, men ser ikke nedtonet ud | Et klik gjorde heller ikke noget før; forskellen er, at de to knapper ikke længere er Tab-stop. "Gem note" har fokus, når "Gemt" skifter tilbage efter 1,5 sekund, og en rigtigt deaktiveret knap ville smide tastaturfokus ud på siden | Nej |
| Spørgsmålsdialogen åbner med fokus i "Hvad vil du spørge om?" | Prototypens fokushjælper flyttede fokus væk igen | Nej (afgjort) |
| Intern note: Esc, "Gem note" og "Slet noten" giver fokus tilbage til noteknappen (før: siden) | Kontraktens dialogregel | Nej (afgjort) |
| Noteknappen vises som før kun, når punktet har en note, når musen er over rækken, når knappen har tastaturfokus, og mens noten er åben; på berøringsskærme (`hover: none`) altid. Det udfyldte noteikon står i knappens tekstfarve (før: mørk ravfarve) | Ikonets tilstedeværelse viser, hvilke punkter der har en note. antd's advarselsfarve har kun 1,9:1 mod hvid, under kravet på 3:1 for grafik | Nej |
| Fasetrinene er deaktiverede `a-steps` i en liste | Ellers bliver hvert trin en knap | Nej |
| Efter "Send til …" får kvitteringens titel fokus (prototypen lod fokus blive bag dialogen) | Ellers lå fokus på antdv's usynlige fokusvagt | Nej (afgjort) |
| Indstilling: beskeden om, hvad der mangler, står under knappen (formularens hjælpetekst) i stedet for til venstre for den; den er stadig knyttet til knappen (`aria-describedby`) og læses op, når man har forsøgt | `a-form-item`'s hjælpetekst | Nej |

### Dokumenter og Credit memo-overdragelsen

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Den slukkede fremvisers sideliste er tekstknapper med en egen klasse (højde auto, ombrydning), så punkter på to linjer kan stå | Ingen antdv-komponent giver et punkt med knap-semantik på to linjer; fremviseren er slået fra | Nej (afgjort) |
| Rækkerne gengives med egne nøgler i stedet for `data-source` | `a-list` giver kun rækkerne nøgler i grid-tilstand; fokus på et fillink gik tabt, når rækker blev indsat over det | Nej |
| Filfeltet hedder `#doc-upload-input` (var `input[data-doc-upload]`) | `a-upload` sender ikke `data-*` videre | Nej |
| En fil, der er åbnet fra en anden skærm, markeres på filnavnet (`mark`) i stedet for med grå baggrund | antdv har ingen valgt-tilstand på listepunkter | Nej |
| Hintet ved træk og slip er et `a-alert` over listen | Ingen egne farver | Nej |
| Fremviseren: titlen står i kortets titel, underlinjen i kortets indhold, og regneark-sider er én sammenhængende `<pre>` | Korttitler er 20 px i temaet | Nej |

### Kundens portal, opstart og formularer

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Landelisten i "salg pr. land" går rundt ved første og sidste land med piletasterne (før: stop ved enderne) | antdv's AutoComplete; Enter, Esc, maks. 8 og præcise træf først virker som før | Nej (afgjort) |
| Testhooks: `data-cs-trade` og `data-cs-noted` står på et omslag, og filfelterne har id'er (`…-trade-file`, `…-noted-<id>-file`) | `a-upload` sender kun `id` videre | Nej |
| Crediwire-login: "Glemt adgangskode?" står på etiketlinjen og før adgangskoden i Tab-rækkefølgen, som før, placeret med en lille layoutregel | En knap inde i antdv's etiket ville blive en del af feltets navn | Nej |
| Påkrævet-stjernerne er tekst skjult for skærmlæsere i etiketten; den forudfyldte mail ser redigerbar ud; ventetiden vises med knappens indbyggede spinner | antd's egen stjerne kom med i feltets navn | Nej |
| Brugertrinnet: virksomhedens navn og CVR står under hinanden, og den grønne boks er et `a-alert` | antd's lodrette formular; teksterne er de samme | Nej |
| Datadeling: måneden vælges i en `a-date-picker` til måneder ("september 2026"; værdien er stadig `YYYY-MM`) og er deaktiveret i forhåndsvisningen | Kontraktens datofelt | Nej |
| ERP-dialogen er 572 px bred, Demo-mærket står ved systemnavnet, og forløbet vises som en `a-timeline`; ingen lukkeknap, som før | Kontraktens dialogstandard | Nej |
| Samtalen er en nummereret liste af `a-comment` | Designsystemets komponenter; id'er, tekster og adfærd er de samme | Nej |
| Tidslinjen: alle trin er deaktiverede, og trinene står lodret under 576 px (før 600 px) | Ellers bliver trinene knapper; antdv's brudpunkt | Nej |
| Tilbage-knappen og de øvrige kontroller følger portalens størrelse: 32 px på computer, 40 px på telefon (prototypen: 44 px) | Den besluttede indstilling for berøringsflader | Nej (afgjort) |
| Kontaktlinjen bruger antdv's blå links i 14 px (var grå i 12,5 px) | Designsystemets mønstre | Nej |
| Oversigtens detaljer: filnavnet er tekst med en "Åbn"-knap ved siden af (før var navnet selve knappen) | Lange filnavne skal kunne bryde ved 390 px | Nej (afgjort) |
| Statusmærkerne er antdv-ikoner og `a-badge`; under 576 px står ét mærke under titlen | Besluttet; ordene til skærmlæsere er de samme | Nej |
| Rådgiverens forhåndsvisningsbjælke er et lyst `a-alert` (var en mørk bjælke) | Designsystemets komponent; tekster og adfærd er de samme | Nej (afgjort) |
| Rolleskift i forhåndsvisningen sender én ekstra `cw-case-changed` (`CW.bump()`) | `CW.isPreview()` er ikke reaktiv; intet gemmes | Nej |
| Portalens dialoger er 572 px brede og centrerede | Kontraktens dialogstandard | Nej |
| Sidens udseende: antd's grå baggrund, hvidt sidehoved, kort som `a-card` og overskrifter i temaets størrelser | Tema; prototypens egne farver og størrelser er ikke porteret | Nej |
| Crediwire-siden (opret bruger og log ind): højre halvdel er hvid med teksten "Digital og sikker deling af jeres finansielle data"; prototypen havde en blå gradient med teksten i et kort | Prototypens egne farver er ikke porteret (kontrakten) | Nej (noteret) |
| Behandlingsstatus viser trinene som prikker (`a-steps` med progress-dot), hvor prototypen viste flueben for gennemførte og en ring for det aktuelle trin; manglende punkter har en lille grå prik | Besluttet for portalen; ordene til skærmlæsere er de samme | Nej (noteret) |
| Slip-feltet får sit navn fra teksten; Mellemrum åbner filvalget | antdv's slip-felt har én størrelse og sender ikke `aria-*` videre | Nej |
| "Bed om hjælp": listen over punkter står fast, mens dialogen er åben | Intet i samme fane kan ændre status imens | Nej |
| "Få hjælp fra revisor eller bank" og "Send en anden fil": forsvinder det fokuserede element med trinnet eller med en fjernet fil, får dialogens titel fokus (før: siden). Hovedknappen er det samme element i begge trin, så fokus bliver på den, når "Næste" bliver til "Send til revisor" | Ellers kunne Esc og Tab ikke bruges i dialogen | Nej (afgjort) |
| Telefon: står der ikke plads, går "Log ud" og sprogvælgeren ned på en linje for sig til højre under sagens linje | Med 40 px knapper blev sagens linje brudt i ca. syv linjer, og sidehovedet blev ca. 200 px højt | Nej (afgjort) |
| Slip-feltet har en synlig fokusring (indvendig, i primærfarven) | antdv viser ingen fokus på slip-feltet; prototypens felt havde en ring | Nej |
| Den valgte demo-fase under "Bruger" er en blå kantknap (`primary` + `ghost`) blandt stiplede, som det valgte sprog i sprogvælgeren (prototypen: mørk kant) | antdv's knapper; før var forskellen kun en hel lysegrå kant mod en stiplet (1,4:1) | Nej |
| Filvælgeren har én størrelse; prototypens kompakte variant (mindre hjørner, luft og skrift) er væk | antdv's slip-felt har én størrelse | Nej |
| Landelisten starter markeringen forfra, når den åbnes igen efter Esc; `a-select` ("Se som", "Handler om", andet system) åbner med pil ned i stedet for at skifte værdi som en indbygget select | antdv 3.2.13's egen tastaturadfærd; resultatet er det samme | Nej (noteret) |

### Credit memo (den indbyggede editor)

| Afvigelse | Begrundelse | Kræver godkendelse |
|---|---|---|
| Memoets dokumentstil følger ant-design-vue (`src/styles/memo-document.less`): tekst 14/12 px (var 13/11,5/10,5), antd's afstande og tabeloverskrifter på lys baggrund (også påtegningernes overskrifter i afsnit 11, der var mørke bånd). AI-mærket ligner `AiBadge` (robotikon) i stedet for en lilla pille, risikomærket er neutralt, kildemærkerne står i antd's røde, og skabelonens felter ("[dato]") står i guld 9 på lys gul (6,2:1; guld 8 gav 4,0:1) | Designstandard frem for prototypens pixels; ingen faste farver, hvor temaet har en variabel | Nej |
| Oprindelsesetiketten ("AI-genereret") står over blokken i normal tekstflow (før: absolut placeret 15 px over) | Kontrakten forbyder negative forskydninger | Nej |
| Monospace-tekst (fx diagrammet i Bilag 3) bruger temaets kodeskrift, så "->" står som to tegn i stedet for en pil | JetBrains Mono er ikke med i designsystemet; kolonnerne flugter stadig | Nej |
| Afsnitslisten er tekst- og linkknapper med en egen klasse (højde auto, ombrydning), så lange titler kan stå. Det aktive afsnit har linkfarve og en streg i venstre side (før: grå baggrund, mørk streg og mørkere tekst) | antdv's knapper er én linje; `a-anchor` og `a-menu` passede ikke til listen | Nej (afgjort) |
| Afsnitslisten ruller selv, når sagens rullefelt er lavere end listen, så alle 14 afsnit kan nås (fx ved 1440 × 900 og 1366 × 768). Listen er højere end før (temaets 14 px tekst, og sagshovedet er højere) | Ellers lå bilagene under skærmkanten, mens listen stod fast | Nej |
| I "@ Kilde"-menuen lukker Tab menuen og går tilbage til teksten, ligesom Esc | Prototypens Esc gik tilbage til teksten; menuens tastaturhjælper giver Esc og Tab samme mål | Nej (afgjort) |
| Forsidens tabel "Virksomhed" er en `a-descriptions` med én kolonne og otte rækker (var 2 × 2) | Med to kolonner blev værdierne brudt midt i ved 1280-1440 px | Nej (afgjort) |
| Værktøjslinjens vippeknapper viser den trykkede tilstand som linkknap (blåt ikon) i stedet for udfyldt baggrund | Et skift mellem knaptyper genopbyggede knappen, og fokus gik tabt efter en kommando | Nej |
| Kommentarknappen under 1440 px er en ikonknap med antallet i et blåt mærke og et rødt "!", når noget blokerer; navnet er det samme som før | Besluttet; rød er forbeholdt "blokerer" | Nej (afgjort) |
| Faktaboksens overskrift "Indstillingen i hovedtræk" er tabellens titel i `a-descriptions` (16 px fed, som "Virksomhed" over den; var en grå etiket på 12 px). Den er stadig en overskrift på niveau 2 (`role="heading"`, `aria-level="2"`) og tabellens navn | Designsystemets tabeltitel; virksomhedens navn er igen størst | Nej |
| ✓ og ✎ er ikoner; tabelbjælken er et lyst `a-card` (var en mørk, svævende bjælke); versionsbanner, generering og oprindelsesforklaring er `a-alert`; kildetooltippen er en `a-tooltip` | Designsystemets komponenter; teksterne er de samme | Nej |
| Kommentarskuffens id, rolle og navn står på skuffens indhold | `a-drawer` sender ikke attributter videre i 3.2.13 | Nej |
| Fejlgrænsen ligger om hele memoet (som prototypens om WSMemo) og fanger fejl, mens memoet sættes op og tegnes, men ikke i klik og taster (som i React) | Vue's `onErrorCaptured`; handlerfejl kendes på Vue's eksporterede fejlkoder (`ErrorCodes`) | Nej |
| Åbnes memoet med en valgt version, får versionsbanneret fokus som før | Memoet indlæses først, når fanen vises, så hændelsen kan komme før | Nej |
| Løste og trukne kommentarer er en fold (`a-collapse`) i stedet for en knap med ✓/↺/▾ | Besluttet for memoet | Nej |
| Kommentarerne er `a-comment` uden avatar inde i trådens kort; tiden står ved forfatteren | Besluttet; frontend-app bruger også `a-comment` | Nej |
| Indsat HTML og AI-svar fortolkes i et tomt dokument uden vindue (`cleanHtml`), så billeder ikke hentes, og `on*`-handlere aldrig kører. Resultatet er det samme som før; kun indhold i `<noscript>` læses som markup i stedet for tekst | Sikkerhed: før kunne fx `<img onerror>` i et AI-svar eller i indsat HTML køre kode i appen og læse AI-nøglerne i `localStorage`. Fejlen findes også i prototypen | Nej (godkendt rettelse) |
| Ved indsæt (og i AI-svar) fjernes `<style>`, `<title>` og `<script>` med indhold i stedet for at blive pakket ud; tabeller, afsnit og lister bevares | Excel og Word lægger et helt dokument med stilark på udklipsholderen; før blev stilarket indsat som synlig tekst over tabellen eller teksten. Fejlen findes også i prototypen | Nej (godkendt rettelse) |
| "Nulstil afsnit" nulstiller kun, når man beder om det: når afsnittet tegnes forfra (fx ved skift mellem en indstillet version, sammenligningen og udkastet), nulstilles det ikke igen, og en låst visning nulstiller eller gemmer aldrig noget | Rettet datatab: i prototypen kørte nulstillingen igen ved hver gentegning, slettede tekst skrevet efter nulstillingen og kunne vise skabelonen i stedet for den indstillede tekst | Nej (godkendt rettelse) |
| "+" (ny kommentar) og "Skriv med AI" vises som i prototypen kun i det afsnit, man arbejder i: "+" ved hover og med tastaturfokus på knappen, "Skriv med AI" også med fokus i afsnittet, på det aktive afsnit og mens panelet er åbent. På berøringsskærme (`hover: none`) står begge altid fremme | Prototypens adfærd ("ellers stod den 14 gange"); ant-design-vue skjuler selv knapper sådan (fx handlingerne i `a-upload`'s filliste). Knapperne er kun gennemsigtige, så de kan nås med Tab, klikkes og læses op | Nej |
| En blokerende kommentar har den røde tekst "Blokerer indstilling" (efter tidspunktet), men ikke prototypens røde streg i venstre side | Stregen kræver egen CSS på kommentarkortet | Nej |
| "Generér memo": mærket "redigeret" står lige efter afsnittets titel (før: yderst til højre i rækken) | Mærket står i afkrydsningsfeltets etiket | Nej |
| Det aktive afsnits tråd har en kant (`a-card` med `bordered`) i stedet for en grå baggrund | Kortets dokumenterede prop | Nej |
| Kommentarens tid og den tomme kommentarlistes tekst er sekundær tekst | antdv's standardfarver (#ccc og 25 % sort) består ikke WCAG AA | Nej |
| Eksport- og genereringsdialogen er 572 px brede (var 520); kildeviseren beholder 860 px | Kontraktens dialogstandard; dokumentsiden kræver bredden | Nej |
| Kildeviseren: antdv's X er skjult, og prototypens "Luk" står i titlen og får fokus ved åbning; siderne er en radiogruppe (piletaster) | Oversat lukkeknap uden dobbelt X; besluttet radiogruppe | Nej |
| Sammenligningen af versioner: afsnitstitlerne er temaets h2, og slettet og indsat tekst står i antd's rød 7 og grøn 8 på lys rød og lys grøn (5,1:1 og 5,4:1) | Temaet; grøn 7 bestod ikke WCAG AA (3,4:1) | Nej |
| "Nyt materiale" og bilagsnoten er `a-alert`; knappen står under teksten | `a-alert` har ingen plads til en handling i 3.2.13 | Nej |
| Kommentaroversigtens rækker og de blokerende kort er knapper med ombrydning (egen klasse) | Samme mønster som afsnitslisten | Nej |
| AI-chatten har som før en fast højde (ca. 690 px), men bliver aldrig højere end pladsen under rail-fanerne (mindst 320 px) | Sagshovedet og fanerne er ca. 40 px højere end i prototypen; ellers lå feltet og Send under skærmkanten ved 1440 × 900 | Nej |
| Chatbeskederne er almindelige blokke (spørgsmålet med fed, svaret med AI-mærket først); ingen mørke eller højrestillede bobler. Forslag er små `a-card` | antdv 3 har ingen chatboble; `a-comment` gav ekstra linjeskift i forslagenes HTML | Nej |
| Den blinkende markør er erstattet af antdv's indikatorer (`a-spin` mens der ventes, et snurrende ikon efter streamet tekst); den bliver stående efter Stop og fejl, som før | antdv har ingen markør-komponent; særheden er bevaret | Nej |
| Fejlbeskeden og beskeden om en tabt markering er `a-alert` og læses derfor op | `a-alert` har `role="alert"` indbygget; begge er svar på en handling | Nej |
| Citatet af markeringen klippes med tre linjers ellipsis i stedet for 76 px og er ikke kursiv | Typografi-komponentens dokumenterede klipning; ingen kursiv-prop | Nej |
| "Indsæt i" er en rigtig etiket på feltet (prototypen manglede et navn), og listen viser hele afsnitsnavne | Kontraktens regel om feltnavne | Nej |
| Startspørgsmålene er knapper med ombrydning (egen klasse), som afsnitslisten | Lange spørgsmål skal kunne bryde i den smalle rail | Nej |
| Forhåndsvisningen er et lille `a-card` i alle tilstande; rå streamet tekst vises som `<pre>` | Samme element hele vejen, så rulningen bevares, når svaret er færdigt | Nej |
| Fanerne i højre skinne (Kommentarer / Spørg om sagen) er ét Tab-stop med piletaster, også i skuffen under 1440 px (egen komponent `MemoRailTabs.vue`). Prototypens to faneknapper var hver et Tab-stop uden piletaster | Kontraktens fanebeslutning | Nej |
| Åbnes skuffen med "Spørg om sagen" valgt, får den valgte fane fokus (prototypen: altid "Kommentarer") | Følger af, at kun den valgte fane er et Tab-stop | Nej |
| Kommentarfeltet i en tråd med to kommentarer kan ved 1440 × 900 stå delvist under skinnens kant; knapperne rulles frem, når de får fokus, og Ctrl+Enter sender | `a-comment` er højere end prototypens kort; skinnens højde regnes som før | Nej (afgjort) |

Hele memoet er kontrolleret mod originalen til sidst: alle tidligere memo-testsuiter kørt igen (243 ens,
resten i dokumenterede kategorier), indstil-forløbet gennem brugerfladen (frigiv kommentar, gennemgå alle 14
afsnit, begrundelser, indstil, kvittering, låst version, Word-eksport, træk tilbage, indstil igen,
sammenlign), opstart og status (`CW_MEMO_STATUS`, `CW_CITE_ISSUES`, `CW_MEMO_SNAPSHOT`), alle
kildehenvisninger, Word-eksporten med og uden kommentarer, hele sidens Tab-rækkefølge og gemt tilstand fra
originalen indlæst i begge apps; på dansk og engelsk og ved 900, 1280, 1440 og 1600 px.

### Teknisk (ingen synlig forskel)

- Logik, der lå inde i React-komponenter, er flyttet til navngivne funktioner i `src/domain` med
  uændrede linjer; tilstandssættere gives med som parametre (`ui`-objekter). De ændrede linjer er
  listet med original og ny tekst i agentrapporterne (fx 103 linjer i sagens domæne).
- Kun navne, som anden kode læser, ligger stadig på `window`; resten er modul-eksporter. Gamle
  CDP-testsuiter, der læste Babel-globaler som `ncParseAmount` eller `findQuote`, skal tilpasses.
- Opstartseffekter og `window`-tildelinger ligger i hvert domænes `index.js` i den gamle rækkefølge.
  `finSyncMapping()` ved opstart returnerer altid `false` nu, fordi ES-moduler kører før xlsx-filen er
  hentet; kvartalerne synkroniseres af hændelsen `cw-mapping-changed`. Slutresultatet er det samme.
- To filer har en `eslint-disable` i filhovedet for ordrette regex'er (`finFormat.js`:
  `no-irregular-whitespace`, `memoCite.js`: `no-control-regex`).
- `CW_OPEN_MEMO` og `CW_OPEN_MEMO_VERSION` gemmer memoets ventende dybdelink og valgte version med
  `setMemoPendingOpen` og `setMemoView` (`src/domain/memo/memoView.js`), fordi en ES-import ikke kan
  tildeles; resten af funktionerne er ordret.

## Ikke porteret (død kode)

Kode uden adfærd er ikke porteret (kontrakten §3). Det drejer sig om:

- **Hele filer:** `portfolio_overview.jsx` (blev aldrig indlæst), `WSCustomerStatus` i
  `customer_status.jsx` (sagens forhåndsvisning brugte altid portalen).
- **Dataanmodninger:** `caseDl` (blev beregnet, men aldrig vist).
- **Porteføljeanalyse:** foldens id `cw-an-criteria` (kun til `aria-controls`), `canRemove` og den
  indre `Lbl`-komponent.
- **Prompt-værksted:** den ubrugte `go`-prop og tjekket for, om AI-dialogen findes.
- **Regnskab og Virksomheden:** `finNoteOf`, `FIN_QUARTER_COLS`, `undoBusy`, `numCell`'s `extra`,
  kildefodens `onClick`-gren, `TrustpilotStars`' `size`, `FinModal` (erstattet af `a-modal`) og
  `window`-eksporterne af UI-komponenterne.
- **Kontomapping:** `selNrs`, `window.MapperPage` og `go`-prop'en.
- **Ny sag:** guidens "oprettet"-tilstand (guiden lukkede i samme opdatering, så den blev aldrig vist)
  og `ncHidden` (erstattet af `.sr-only`).
- **Sagen:** `wsOff`, `wsPct`, `wsSelectorStatus`, `wsPortalHasPreview`, `deadlineIso`/`deadlinePast`,
  `OutstandingItem`'s `reminder` og `note`, `WSItemList`'s `recipient`, `WSCustomerEvents`' `cs`,
  `WSPublicSources`' `back`, `WSRemindModal`'s `first`, `backToOutstanding`, kvitteringens `sub` og
  samtalens `note`-prop.
- **Dokumenter:** `suggestItemFor` og `AssignUploadDialog` (ingen kaldere), `docMeta` (erstattet af
  `DocMetaLine.vue`) og `window.WSDocuments`/`window.WSMemoHandoff`.
- **Kunden og portalen:** `CWCustomerBanner`, `csLinkBtn`, samtalens `compact`/`bare`/`note`,
  `firstFresh`, lytteren `cw-ask-about`, opstartens trin "data" med `ObStepper` m.fl.,
  `PortalPvStepNav`, `PortalNeedCard`, hubrækkens menu, `PortalHub`'s ubrugte tilstand og
  `DelegateBundleModal`'s `preselect`. `CWDialogCard` var en tynd indpakning om samtalen; portalen viser
  samtalen direkte med `CustomerConversation` (kundens side, skrivebeskyttet) i `PortalHub.vue`.
- **Memo:** `_memoTxt`, `_cmtStamp`, `buildGround` og `ORIGIN_LABEL`.

## Bevarede særheder

Fejl og særheder, der fandtes i prototypen, er bevaret (paritet), bl.a.:

- Klokken og Dataanmodninger sætter fokus på `#ws-dialog-title`, men samtalens overskrift hedder
  `#ws-dialog-h`.
- Kontomapping: `mapKr` viser "−0" for -0,4 og -0,5; Shift+Mellemrum vælger også et område; "Fjern
  markering", "Vis balancen" og "Prøv igen" forsvinder ved klik, og fokus falder til siden.
- Dokumenter: "Hent alle" markerer alle punkter, også hvis en hentning fejlede; gruppernes antal
  tæller alle punkter, opsummeringen kun dem, der kan hentes.
- Sagen: `wsFirstToReviewSel` returnerer stadig en CSS-selektor, og fortrydelsen af en ændret
  anmodning skriver stadig direkte i `localStorage`.
- Portalen: `?lang=` i adressen vinder over sprogvælgeren ved genindlæsning; den redigerede besked
  i "Bed om hjælp" gemmes ikke; "Træk adgangen tilbage?" åbner med fokus på den farlige knap.
- Memo: en kildehenvisning, der indsættes i fed tekst, går tabt; scroll-spionen stopper efter et
  versionsskift; tabelbjælken står ikke rigtigt fast; "Luk" i kommentarskuffen flytter ikke fokus.

## Tilgængelighed: kendte forskelle

Den blinde tilgængelighedsgennemgang (tastatur og tilgængelighedstræet) fandt også følgende, som ikke er
rettet. De fleste skyldes ant-design-vue 3.2.13's egne komponenter; flere fandtes også i prototypen.

- **Kontrast**: sekundær tekst, pladsholdere, tomme lister og tallene i ventende trin er gjort mørkere i
  temaet (4,7:1 mod hvid; se afvigelserne), og ord står ikke længere i advarselsfarven (1,9:1); et ikon
  bærer advarslen. Tilbage står designsystemets brandfarver brugt som tekst: links og primærknapper
  (`#1890ff`, 3,2:1), fejltekst (`#ff4d4f`, 3,3:1) og grønne flueben (`#52c41a`, 2,3:1). De kræver en
  beslutning om brandfarverne, før portalen bruges af rigtige kunder.
- **Tekstfelter og lister** viser fokus med antd's kant og glød (ca. 1,8:1), ikke med en ring.
- **Datovælgeren** (`a-date-picker`): datoen skrives (DD-MM-ÅÅÅÅ), eller kalenderen åbnes, og så
  flytter Tab ind i kalenderen, hvor piletasterne flytter datoen, og Enter vælger. Prototypens
  indbyggede datofelt ændrede dag, måned og år direkte med piletasterne.
- **Rækkernes titler er `h4`-overskrifter** i Dokumenter, Credit memo-overdragelsen og
  Dataanmodninger (`a-list-item-meta` gør titlen til en overskrift); prototypens rækker var knapper.
- **Faner uden indhold i panelet** (Mine opgaver, sagens faner): fanepanelerne er tomme, fordi
  indholdet står uden for `a-tabs`, så `aria-controls` peger på et tomt panel.
- **Hovedmenuen** er en navigation med knapper og `aria-current` som i prototypen (se ovenfor). Efter
  tastaturnavigation kan det sidste punkt se aktivt ud, til musen bevæger sig.
- **Tweaks-panelet** (kun i Claude Design-værten) er en `a-drawer` uden dialogrolle, og krydset
  hedder "Close".
- **Memoet**: dokumentets grå tekst bruger designsystemets sekundære farve (se kontrast ovenfor);
  værktøjslinjens vippeknapper viser den trykkede tilstand med farve i stedet for udfyldt baggrund; forsidens
  "Virksomhed" er en tabeltitel uden overskriftssemantik, og tabellen har intet navn.
- **Fandtes også i prototypen (memoet)**: "Nulstil afsnit" og "Omskriv markeringen" kan kun bruges med
  musen; fokus falder til siden efter flere kommentarhandlinger; AI-felterne har kun pladsholdertekst som
  etiket; brede tabeller klippes ved 320 px; den faste værktøjslinje kan dække en fokuseret knap; afsnittets
  "+" får fokus før "Skriv med AI", selv om den står til højre.
- **Fandtes også i prototypen**: fokus falder til siden i nogle flows, når en knap forsvinder;
  "Stil spørgsmål til materialet" og "Træk tilbage" har et længere navn end den synlige tekst;
  søgefelternes levende region bliver ikke udfyldt; to knapper hedder "Åbn sagen" i Ny sag; to
  `h1` på sagens faner; grafens tal på de nedtonede søjler har lav kontrast.

## Kendt teknisk gæld og bevidste valg

Den blinde kodegennemgang pegede på følgende. Det er bevidste valg i migrationen (funktionen først,
forretningslogikken flyttet ordret), men det er det, en udvikler bør kende og eventuelt rydde op i
bagefter:

- **Domænelogikken taler stadig sammen via `window`** (`t`, `DATA`, `CW`, `CASE_DOCS`, `AI`,
  `__go` m.fl.), og rækkefølgen i `src/bootstrap.js` er derfor vigtig. Koden er flyttet ordret
  (kontrakten), så globalerne er bevaret. Næste skridt: erstat dem med imports, modul for modul.
- **Komponentlogik, der blev til domænefunktioner, får React-agtige sættere med** (`ui`-objekter som
  `{ setDeclining }`), så linjerne kunne forblive identiske. De kan gøres til almindelige parametre
  eller returværdier, når ordretheden ikke længere skal bevises.
- **Et lille lag af tilgængelighedsrettelser på antdv's DOM** (`useTabsKeyboard`, `useUploadButton`,
  hovedmenuens Tab-stop og roller (`role="none"` på listen), `aria-*` på datofelterne, `aria-modal` via `wrap-props`, navnet på
  memofaktaboksens tabel i `a-descriptions`). Det er rettelser
  af huller i antdv 3.2.13 og kan fjernes ved en opgradering, der lukker hullerne. Regnskabstabellen
  tegnes forfra (`key`), når kvartalerne foldes ud eller sammen, fordi 3.2.13 ikke fjerner sin vandrette
  rulning igen.
- **Fokus sættes flere steder med små gentagne forsøg** (`CW.focusSoon` og lignende), som i
  prototypen, fordi elementet først findes efter en animation eller en indlæsning.
- **Otte overlays og memoets tre dialoger er altid `:visible="true"` og vises med `v-if` hos
  forælderen** (fx afslag, påmindelse, Anmod om materiale, kundens forhåndsvisning, memoets eksport,
  generering og kildeviser), så deres indhold starter forfra, som i prototypen. De lukker derfor uden
  antdv's lukkeanimation og giver selv fokus tilbage. De øvrige dialoger bruger `visible`.
- **To steder åbner en `a-button` et skjult filfelt** (Regnskabs "Importér budget", som deles af
  værktøjslinjen og grafen, og "Upload for kunden" på et anmodet punkt); andre steder bruges
  `a-upload`. Begge virker og er testet; de kan samles på `a-upload` + `useUploadButton`.
- **Enkelte regler styler kontroller** frem for kun at lave layout, hvor designsystemet ikke har en
  variant: Regnskabs redigerbare celler (fokusring i cellen, feltet lagt over cellen), knapper med
  tekst på flere linjer (memoets afsnitsliste, kommentaroversigt, trådtitler, "Simulér svar fra …" og
  chattens startspørgsmål, kundens punkter, fremviserens sider, grafens "Importér budget"), synligheden af
  memoafsnittenes "+" og "Skriv med AI" og af noteknappen i Sagen (`opacity`, vist ved hover og fokus som i
  prototypen, altid ved `hover: none`), hovedmenuens mærker (`margin-right: 0`) og de globale fokusringe i
  `src/styles/focus.less`. Ingen af dem bruger `.ant-*`-selektorer eller `!important`.
- **Faste afstande**: Regnskabs rækkeetiketter er rykket ind 29/44 px, så de flugter med
  udfoldningsknappen, og de udfoldede kvartaler bryder ud til `min(1280px, calc(100vw - 290px))`
  (samme formel som prototypen). Beskedernes første placering (`CW.toast`) gætter på notifikationens
  størrelse; ligger fokus senere under den, flyttes den ud fra den faktiske størrelse. Memoets
  indrykning under afsnitsnummeret står ét sted (`src/styles/memo-layout.less`); afstanden mellem
  afsnittene og margenerne ved memoets brudpunkter er prototypens værdier.
- **Faste farver, som temaet ikke har**: Crediwires mærke (#3b3854), to farver i JavaScript (`a-badge`'s
  `number-style` i Mine opgaver og ikonernes `two-tone-color`) og antd's grå 7 og 8 (#8c8c8c og #595959)
  til grafens EBITDA og Trustpilot-stjernerne; ant-design-vue 3.x har ingen variabler for dem, så de blandes
  af `@black` og `@white` i Less. antd's egne farver i CSS står som temaets Less-variabler.
- **Næsten ens kode to steder**: kundens tidslinje (`CustomerTimeline.vue`) og portalens trin
  (`PortalSteps.vue`), og ni udfyldningshjælpere (`wsFill`, `csFill`, `ncFill` …), der er flyttet
  ordret fra hver sin fil.
- **Kommentarer med linjenumre i de gamle filer** (fx "workspace.jsx L553") henviser til prototypen,
  som den var ved migrationens start (commit 6402c04 på denne branch og mappen `credit-model`).
- **ESLint-undtagelsen for `src/domain/**`** dækker også få nye linjer omkring den flyttede kode, fx
  ubrugte parametre i ordrette linjer i `finColumns.js` og memoets opstartsmodul
  (`src/domain/memo/index.js`), der som prototypen læser `t` og `CW` som globaler og lægger AI-mærkets
  tekster på `<html>`, når det indlæses.
- **Testkroge fra prototypen er bevaret**: `window.__memoApis` (afsnittenes API), `window.__memoCheckCite`
  og `window.__memoLastExport` (den sidste Word-eksport), og `window.SEC` og `window.MEMO_SOURCES`, der
  var globale navne i prototypen. Kun browsertests bruger dem; de kan fjernes, når testene er skrevet om.
- **Memoets domænemoduler eksporterer også interne hjælpere** (fx `_cite*` i `memoCite.js`), fordi
  alle navne var globale i prototypen, og golden I/O-testen kalder dem direkte. Et mindre offentligt API
  kan laves, når der ikke længere skal sammenlignes med prototypen.
- **Memoets højre skinne** er en `div` fra 1440 px og ellers en `a-drawer`; den vælges med
  `<component :is>`, så indholdet kun står ét sted.
- **Kendte fejl fra prototypen står også som kommentarer** ("Kendt fra prototypen (bevaret)") ved
  koden, så de ikke rettes uden en beslutning.
- **Bundtet er stort** (ca. 1,8 MB for hovedfilen), fordi hele ant-design-vue registreres globalt og
  `antd.less` indlæses samlet, som i frontend-app. Vite advarer om filstørrelsen; det er ikke en fejl.

## Udførte checks

Alle checks er kørt mod en frossen kopi af den oprindelige app (port 8187) og den migrerede app (Vite,
port 5188) i headless Chrome, på dansk og engelsk. Scripts og resultater: se [HANDOVER.md](HANDOVER.md)
under "Test".

- **Build og lint**: `npm run build` (exit 0; Vite advarer kun om filstørrelsen) og `npm run lint`
  (0 fejl; 33 advarsler, alle i kode, der er flyttet ordret fra prototypen: `src/domain`,
  `src/i18n` og `devserver.js`).
- **Forbudte mønstre** (`scan_forbidden.js --final`): 0 fund. Ingen `antd`, `@ant-design/icons`,
  `react` eller `react-dom` i koden, `package.json`, `package-lock.json`, `node_modules` eller det byggede
  bundt; ingen `!important`, negative marginer eller `.ant-*`-selektorer (heller ikke i `:deep()`); ingen
  midlertidige stubbe og ingen `.jsx`-filer.
- **Forretningslogikken** (`domain_diff.js` mod originalen): af de 20 filer, der er flyttet hele, er 13
  identiske, 6 afviger kun med `export`-linjer, og `case_state.js` har mistet sine React-hooks (`toast` og
  `confirm` tegnes nu med antdv). I de 51 moduler med logik flyttet ud af `.jsx`-filerne er 629
  funktioner ordret identiske (plus 9 indlejrede), 72 er nye hjælpere omkring dem, og 3 er ændret og
  dokumenteret ovenfor (`pct`, `openRequestCase` og `cleanHtml`).
- **Golden I/O**: 25.914 kald af domænefunktionerne (14 områder: formatering, tolkning, validering,
  Regnskab, mapping, sagen, forløb, opgaver, analyse, anmodninger, arbejdsfladen, portalen, AI og memoet)
  med fast ur og fast tilfældighed giver samme resultat i begge apps. De eneste forskelle er død kode, der
  ikke er porteret (fx `wsPct`, `buildGround`, `obDone`), og JSX-hjælpere, der nu er komponenter
  (sammenlignet som tekst). Kørt igen til sidst med 0 nye forskelle. Efter rettelserne 8. oktober giver
  ét af de fire `cleanHtml`-input bevidst et andet resultat på begge sprog: indholdet af
  `<script>bad()</script>` kommer ikke længere med som tekst; alle andre 25.912 kald er uændrede.
- **Funktionel tjekliste pr. område**, side om side med originalen, med tastatur, tilstande (tom,
  indlæser, fejl, deaktiveret) og skærmbilleder ved 1280, 1440 og 900 px (portalen også 390 px): sagen
  (155 punkter), sidehoved og lister (146), kundens portal (64) og memoet (39 punkter og 10
  paritetstjek), plus områdernes egne suiter (fx Regnskab, Kontomapping, Ny sag og Dokumenter). Forskelle
  er rettet eller står under afvigelserne.
- **Blind slutrunde**: tre uafhængige gennemgange uden kendskab til tidligere fund (brugerflows,
  tastatur og tilgængelighed, kodegennemgang), først for alt uden for memoet og derefter for memoet.
  Fundene er rettet eller beskrevet under afvigelser, tilgængelighed og teknisk gæld.
- **Originalen er urørt**: fingeraftrykket af `credit-model` (HEAD, status, diff og ikke-sporede filer)
  er det samme som ved start. Intet er pushet; branchen findes kun lokalt.

## Ikke verificeret

- Rigtige skærmlæsere (NVDA, JAWS, VoiceOver). Navne, roller, tilstande og fokus er kontrolleret i
  Chromes tilgængelighedstræ.
- Rigtige AI-kald (Anthropic, OpenAI, Azure og den lokale AI-bro): `AI.stream` var erstattet i alle test,
  og "Test forbindelse" og "Hent modeller" er ikke kørt mod en udbyder.
- Rigtige downloads og operativsystemets filvælger og træk og slip: indholdet er sammenlignet via
  fangede klik, blobs og syntetiske hændelser.
- Memoets Word-eksport åbnet i Microsoft Word: den genererede HTML og den hentede fil (navn, størrelse og
  BOM) er sammenlignet med originalens og er ens.
- Rigtig indsættelse fra Excel og Word i memoet: indsæt er afprøvet med syntetiske udklipsholder-hændelser
  med hele Excel- og Word-dokumenter, sådan som Chrome returnerer dem fra udklipsholderen (`<head>` med
  stilark og `<!--StartFragment-->`).
- Faste tabeloverskrifter (eget `<thead>` med `position: sticky`) i Regnskab og Kontomapping er kun afprøvet i
  Chrome; Firefox og Safari er ikke prøvet.
- Andre browsere end Chrome (fx Safari på iPhone) og rigtig berøring; telefonbredden er emuleret.
- Prompt-værkstedets "Gem" til disken (endpointet blev efterlignet i testene).
- Vinduer lavere end ca. 600 px, og opdatering fra en anden fane (`storage`) er kun delvist afprøvet.
- De gamle CDP-testsuiter fra prototypen er ikke kørt; de skal have nye selektorer.
