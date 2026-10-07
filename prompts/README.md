# Prompts til "Kør AI igen"

Her ligger de prompts, Crediwire bruger, når rådgiveren trykker på pilen i ring
("Kør AI igen") ved en AI-tekst under **Virksomheden → Produkt, marked og branche**.
Du kan rette dem frit. Appen læser filen, hver gang AI'en køres, så en ændring
virker ved næste klik (lokalt med `devserver.js`; på Cloudflare først når mappen
er udgivet).

| Fil | Bruges til |
|---|---|
| `produktbeskrivelse.md` | Produktbeskrivelse |
| `markedet.md` | Markedet |
| `pest.md` | Hvert af de fire PEST-punkter (Politisk, Økonomisk, Socialt, Teknologisk) |

## Sådan er en fil bygget op

- **`## Indstillinger`**: `websøgning: ja` eller `nej`. Med `ja` må AI'en søge på
  nettet, når motoren kan (Claude Code via den lokale bro og Claude via API-nøgle).
  Med ChatGPT, Copilot og Codex søges der ikke; så får AI'en besked om det.
  Med web-søgning tager en kørsel typisk 1-4 minutter, fordi AI'en både søger
  og læser kilderne. Sæt `nej`, hvis teksten kun skal bygge på sagens materiale.
- **`## System`**: rollen og de faste regler (systemprompt).
- **`## Opgave`**: selve opgaven med sagens oplysninger. Alt under overskriften
  sendes, også tomme linjer.

Tekst over første `##` (titel og forklaring) sendes ikke til AI'en.

## Pladsholdere

Appen udfylder disse, før prompten sendes:

| Pladsholder | Indhold |
|---|---|
| `{virksomhed}` | Virksomhedens navn |
| `{cvr}` | CVR-nummer |
| `{branche}` | Branchekode og -tekst fra CVR (rettet værdi, hvis rådgiveren har rettet den) |
| `{aktivitet}` | Kort aktivitetsbeskrivelse |
| `{hjemsted}` | Hjemsted |
| `{ansatte}` | Antal ansatte |
| `{hjemmeside}` | Virksomhedens hjemmeside |
| `{dato}` | Dagens dato |
| `{sprog}` | `dansk` eller `engelsk` (appens sprog) |
| `{materiale}` | Uddrag af sagens materiale: ledelsesberetningen i den nyeste årsrapport og markedsrapporten, hvis der er en |
| `{nuvaerende_tekst}` | Den tekst, der står i boksen nu (seneste AI-udkast) |
| `{faktor}` | Kun i `pest.md`: Politisk, Økonomisk, Socialt eller Teknologisk |

## Gode råd, når du retter

- Skriv **hvorfor** frem for at gentage forbud. Modellerne følger en begrundelse
  bedre end store bogstaver.
- Længden styres af ord og sætninger. Boksen viser ca. 110 tegn pr. linje, så
  60 ord er 3-4 linjer.
- Hold opgaven til én tekst. Vil du have noget nyt med (fx ESG), så tilføj det
  som et punkt i Opgave i stedet for en ny regel i System.
