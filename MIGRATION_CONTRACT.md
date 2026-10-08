# Migrationskontrakt: React-prototype → Vue 3 + ant-design-vue 3.x

Gælder for alt arbejde på branchen `ant-design-vue-migration` (denne mappe, `credit-model-antdv`).
Læses før hver opgave, også af subagenter. Ved konflikt vinder denne fil over andre noter.
Beslutninger kan kun ændres af Jesper. Åbne spørgsmål samles og stilles til sidst.

## 1. Formål og prioritet (Jespers ord)

"Kontrolleret UI-migration, ikke et kreativt redesign. Koden skal kunne overtages af en
frontendudvikler uden et efterfølgende oprydningsprojekt."
**Prioritet: bevaret funktionalitet → designsystemets standarder → enkel, vedligeholdbar kode.
Prototypens præcise pixels har lavere prioritet.**

## 2. Ufravigelige krav

1. **Brug aldrig React-udgaven af Ant Design** (`antd`, `@ant-design/icons` (React), `@ant-design/pro-*`,
   `@ant-design/charts`, `react`, `react-dom`), heller ikke midlertidigt eller i værktøjer. Verificeres til sidst.
   Tilladt: `ant-design-vue`, `@ant-design/icons-vue`, og deres neutrale hjælpepakker
   `@ant-design/colors`/`@ant-design/icons-svg`.
2. **`ant-design-vue@3.2.13` og `@ant-design/icons-vue@6.1.0`, låst** (som produktionens frontend-app).
   Ingen utilsigtede versionsopgraderinger. Kun v3-API: `visible`, ikke `open`; Dropdown med `#overlay`;
   ingen `items`-props på Menu/Tabs/Steps m.fl.; ingen Segmented, Flex, QRCode, Watermark, Tour,
   FloatButton, App eller theme-tokens (v4). Opslag: https://3x.antdv.com.
3. **Originalen røres aldrig.** Kun denne kopi ændres. Intet `git push` (repoet er offentligt, og
   Cloudflare bygger previews af pushede branches). Ingen commits af interne mapper/data.
4. **Genbrug først designsystemets mønstre, derefter ant-design-vue direkte.** Ingen hjemmelavede
   erstatninger for knapper, inputs, selects, tabeller, modaler, menuer, faner, tooltips osv. Domæne-
   komponenter må sammensætte standardkomponenter. Intet nyt generisk UI-lag eller wrappers uden
   konkret behov. Designreferencen er Crediwires frontend-app (privat repo): gentag mønstrene med
   antdv, **kopiér aldrig dens kode, CSS, ikoner eller assets** hertil (dette repo er offentligt).
5. **Dokumenterede props, slots og varianter før custom CSS.** Kun minimal scoped CSS til sidelayout.
   Forbudt: `!important`, negative marginer, selektorer på interne `.ant-*`-klasser (også `:deep(.ant-…)`),
   vilkårlige pixeljusteringer for at ligne prototypen. Tema kun via v3's Less-variabler (`vite.config.mjs`).
6. **Bevar beregninger, afrunding, validering, dataflow, API-kontrakter og brugeropgaver.**
   Omskriv ikke forretningslogik, tilføj ikke features. Layout og præsentation må forenkles til
   designsystemets naturlige mønstre, når funktionaliteten bevares. Funktionelle ændringer kræver
   særskilt godkendelse: lav den mindste løsning, der bevarer funktionen, og skriv den på listen over
   spørgsmål. Skjul ikke manglende funktioner, og erstat dem ikke med statiske værdier.
7. **Mangler en passende komponent:** prøv en enkel sammensætning af eksisterende komponenter.
   Er det utilstrækkeligt: beskriv blokeringen og den mindste nødvendige undtagelse. Byg ikke stiltiende
   en custom løsning. Undgå abstraktioner, nye biblioteker og refaktorering uden for migrationens behov.
8. **Svæk aldrig tests eller tjek for at få grønt.** Det, der ikke kan verificeres, markeres tydeligt.
9. **Arbejdet afbrydes ikke af spørgsmål;** de samles til allersidst.
10. **Rækkefølge:** Credit memo-editoren (det indbyggede memo i `memo.jsx` og dens AI-del i `memo_ai.jsx`)
    migreres **sidst**. Memo-logik, som synlige skærme bruger (`CW_MEMO_STATUS`, `CW_MEMO_SNAPSHOT`,
    seeding af kommentarer m.m.), trækkes ud tidligt, så intet synligt ændrer sig.

## 3. Beslutninger og fortolkninger

| Emne | Beslutning |
|---|---|
| Framework | Vue 3 (`<script setup>`, JavaScript), Vite 8, ESLint 10 (flat). Ingen TypeScript, ingen vue-router, ingen Pinia: skærmene bruger den eksisterende `window.CW`-store |
| Versioner | vue 3.5.43 (inden for produktionens `^3.5.10`; retter audit-fund), dayjs 1.11.8, less 4.9.1. Se `package.json` |
| Registrering | `app.use(Antd)` globalt og `a-*`-tags, som frontend-app |
| Tema | `ant-design-vue/dist/antd.less` + `modifyVars`: Source Sans Pro, radius 4 px, h1 30 px, h2 20 px, h3 16 px, kort- og modaltitler 20 px, hvidt sidehoved 56 px. Primærfarve antd's `#1890ff` (= Crediwire). Prototypens `tokens.css`/`styles.css` (Inter, egne farver) porteres ikke |
| Sprog | `t('dansk nøgle')` uændret (nøglerne må ikke ændres). Ordbøgerne i `src/i18n/dict` importeres i den gamle rækkefølge. Rod-`a-config-provider` med da_DK/en_US + `dayjs.locale` |
| Forretningslogik | `src/domain/*.js` er prototypens logikfiler **byte-identiske** bortset fra tilføjede `export`-linjer; `window.CW/DATA/AI/...` bevares. `case_state.js`: kun React-hooks fjernet og toast/confirm sendt til ant-design-vue. Logik og opstarts-effekter fra .jsx-filerne flyttes **ordret** til `src/domain/` og importeres i `src/bootstrap.js` i den gamle rækkefølge |
| Navigation | Samme rutestreng i `localStorage.cw_route`, `go()`, `cw-route-changed`, titler og fokus på h1 (`src/composables/useNavigation.js`) |
| Reaktivitet | `useCaseVersion()`/`useCase()` på `cw-case-changed` (ikke `storage`, som før). Øvrige window-events med `useWindowEvent` og uændrede navne |
| Feedback | `CW.toast` → `notification` nederst til højre + levende region; `CW.confirm` → `ConfirmDialog.vue` (`a-modal`). Signaturerne er uændrede |
| Ikoner | `@ant-design/icons-vue`; dekorative ikoner får `aria-hidden="true"`. AI-mærket = `RobotOutlined` |
| Segmenteret valg | `a-radio-group option-type="button"` (Segmented findes ikke i 3.2.13) |
| Diagram (Regnskab) | Prototypens SVG-diagram porteres som domænekomponent (antdv har ingen diagrammer; ApexCharts ville være et nyt bibliotek). Åbent spørgsmål |
| Tweaks-panel | Beholdt med samme værtsprotokol. Accentfarve-knappen er fjernet (strider mod temaet). Åbent spørgsmål |
| Runtime-filer | `prompts/*.md` og `data/*.xlsx` bliver i roden. Bygget kopierer dem til `dist/`; `devserver.js` serverer `dist/` og prompter/data live |
| Midlertidige stubs | Markeres `MIGRATION-STUB` og må ikke findes i den færdige app |
| Tastatur | antdv 3.2.13's dropdown-menuer og faner kan ikke betjenes som prototypens (verificeret). **Alle** `a-dropdown`-menuer bruger `useMenuKeyboard` (fokus på første punkt, piletaster, Enter, Esc tilbage til knappen, Tab videre), og faner med flere visninger bruger `useTabsKeyboard` (giver også fanelisten navnet fra `<a-tabs :aria-label>`, som 3.2.13 lægger på den ydre div). Folde (`a-collapse`) åbner kun med Enter i 3.2.13: læg `useCollapseKeyboard` på et element rundt om, så Mellemrum også virker som på prototypens knap, og giv `:expand-icon="collapseExpandIcon"` (antdv's pil har ellers `aria-label="right"`, som kommer med i overskriftens navn). Popovers med indhold: fokus ind ved åbning og Esc lukker (se filteret i `PortfolioView.vue`). Dialogernes fokus klares ét sted af `useDialogFocus` (App.vue) for alle dialoger med aria-modal: første element ved åbning (ikke antdv's usynlige vagt), krydset hedder "Luk", og Esc og Tab virker, når det fokuserede element er forsvundet; byg ikke egne lyttere til det. Ikke-modale paneler, der var dialoger i prototypen (klokken, menupanelet på smal skærm), holder Tab inde med `useFocusTrap` (antdv's popover og skuffe gør det ikke). Synligt tastaturfokus kommer fra `src/styles/focus.less` (faner, folde, knapper og links); tilføj ikke egne fokusregler pr. skærm. En `a-select`/`a-auto-complete` i en `a-modal`/`a-drawer` får `useSelectEscape` på et element rundt om, så Esc i den åbne liste kun lukker listen (3.2.13 lader Esc boble videre og lukker dialogen). Hovedmenuens punkter er knapper i en navigation og Tab-stop (som prototypens knapper; `role="button"`, `aria-current` og `role="none"` på listen i `AppSidebar.vue`) |
| Feltnavne | `aria-label` på `a-select` (og andre sammensatte felter) når ikke frem til selve inputtet i 3.2.13. Navngiv felter med `a-form-item :label` + `html-for` og feltets `id` (eller `aria-labelledby` til en synlig etiket). Var prototypens etiket uden kolon, så `:colon="false"` på `a-form`/`a-form-item` (vandret og inline layout), så teksten er den samme |
| Knapper og validering | Én primær handling pr. område; sekundære handlinger er standardknapper, inline-handlinger `type="link"`/`"text"`. Hvor prototypen lod en knap være klikbar og viste valideringsbesked (aria-disabled), bevares det: knappen forbliver aktiv, og beskeden vises med `a-form-item` `help`/`validate-status` |
| Dialoger | `a-modal` med bredde 572 som standard (frontend-app); bredere kun når indholdet kræver det. Dialoger med lister, der kan vokse, holder titel og knapper fast og lader kun indholdet rulle (`:body-style="dialogBodyStyle"` fra `src/components/common/dialogBody.js`, som prototypen); skifter dialogen trin, starter det nye trin øverst (`scrollDialogBodyToTop`). Andre dialoger ruller som antdv's standard. antdv's lukkeknap har den indbyggede `aria-label="Close"` (kan ikke oversættes i 3.2.13; noteret). antdv husker kun det element, der åbnede dialogen, hvis fokus stadig er udenfor, når åbne-animationen slutter, og giver kun fokus tilbage, når `visible` bliver false (ikke ved afmontering). Flytter en dialog fokus ind med det samme, eller fjernes den med `v-if`, husker den selv `document.activeElement` ved åbning og giver fokus tilbage på lukke-vejene (mønster: `confirmPrev` i `src/services/feedback.js`). 3.2.13 sætter `role="dialog"` uden `aria-modal`: alle `a-modal` får `:wrap-props="{ 'aria-modal': 'true' }"` (dokumenteret prop; evt. med `aria-labelledby`). En `a-date-picker` i en dialog: Esc i den åbne kalender må kun lukke kalenderen (sæt `aria-expanded` på dens input via template-ref, og brug `useSelectEscape`) |
| Radioknapper | antdv 3.2.13 sætter hverken `name` eller `role` på `a-radio-group`: giv altid et unikt `name` (så piletasterne virker og grupperingen er rigtig) og, når gruppen har en etiket, `role="radiogroup"` + `aria-label` (eller `aria-labelledby`) |
| Sprogvælger | `src/components/shell/LanguageSwitcher.vue` (= shell.jsx `LanguageSwitcher`, kompakt): to knapper med `aria-pressed` i en gruppe, ikke en radiogruppe (piletaster ville skifte sprog og genindlæse siden). Bruges i sidebjælken, portalens sidehoved og Crediwire-login |
| Død kode | Ubrugte props, variabler og hjælpere (kode uden adfærd) porteres ikke; de listes i rapporten |

## 4. Regler for subagenter

- Arbejd kun i de filer, opgaven giver dig ejerskab over. Ret ikke `App.vue`, `main.js`, `bootstrap.js`,
  `src/composables/*`, `src/services/*`, `src/components/shell/*` eller andres skærme. Behov der: skriv
  dem i din rapport.
- Ny forretningslogik fra en .jsx-fil: flyt den **ordret** til `src/domain/<område>.js` og angiv i rapporten,
  hvilken import `bootstrap.js` skal have, hvis den har opstarts-effekter eller `window`-providers.
- Referencer: piloten (`src/views/portfolio/PortfolioView.vue`, `src/components/shell/*`), API-arket
  `antdv3_api.md` og runtime-props i `antdv3_runtime_api.json` (scratchpad `understand/`).
- Tjek før aflevering: `npx eslint <dine filer>` uden fejl, ingen forbudte mønstre (se 2.1 og 2.5) og en
  liste over afvigelser og det, du ikke kunne verificere.
- Ingen git-kommandoer, der ændrer noget. Ingen servere eller Chromes, du ikke selv lukker igen.
- Kan være afbrudt før: findes der allerede arbejde i dine filer (uden `MIGRATION-STUB`), så gennemgå det
  kritisk mod originalen og byg videre i stedet for at starte forfra.
- **Komponenters API følger originalen**, så parallelle agenter rammer samme grænseflade: data-props beholder
  React-komponentens navne; callback-props bliver emits (`close`/`onClose` → `close`, `back` → `back`,
  `onOpenFlow` → `open-flow`, `onX` → `x`); `go`-props droppes (brug `useNavigation`). Skriv props/emits i en
  kort kommentar øverst. Pladsholdere på aftalte stier (fx `views/customer/CustomerConversation.vue`) må
  importeres, før de er færdige.
- **Logik med opstarts-effekter eller window-providers** lægges i domæne-indgangene, som `bootstrap.js` allerede
  importerer i den gamle rækkefølge: `domain/financials/index.js`, `domain/memo_handoff.js`, `domain/prompts.js`,
  `domain/memo/index.js`, `domain/workspace/index.js`. Den agent, der ejer en indgang, skriver den.

## 5. Slutkontrol (alle skal være udført og rapporteret)

Build, lint · scanning for React-Ant Design (kode, `package.json`, lockfil, `node_modules`, bundle) ·
scanning for `!important`, negative marginer, `.ant-*`-selektorer og `MIGRATION-STUB` · diff af
`src/domain` mod baseline · beregninger: gyldne input/output mod originalen · funktionstjekliste mod
originalen i browseren · skærmbilleder i relevante bredder · tastatur · loading/empty/error/disabled ·
blind slutrunde · originalen urørt (fingeraftryk) · alt uverificeret markeret.
