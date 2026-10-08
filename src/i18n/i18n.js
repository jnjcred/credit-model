// Sprogvalg - dansk (kilde) og engelsk.
// (Svenske ordbogsposter findes stadig, men sproget er slået fra i UI'et.)
//
// Dansk tekst er selve nøglen: t('Ny sag') slår op i window.I18N[lang] og
// falder tilbage til den danske streng hvis oversættelsen mangler. Sproget
// gemmes i localStorage og skifter via fuld genindlæsning - alle komponenter
// læser t() ved render, så en reload er den enkleste korrekte model her.
(function () {
  // ?lang=en i URL'en vinder over det gemte valg og gemmes med det samme.
  // Bruges til delbare links og til headless test af hvert sprog.
  var fromUrl = null;
  try {
    fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl === 'da' || fromUrl === 'en') {
      localStorage.setItem('cw_lang', fromUrl);
    } else {
      fromUrl = null;
    }
  } catch (e) { fromUrl = null; }

  var stored = null;
  try { stored = localStorage.getItem('cw_lang'); } catch (e) {}
  var LANG = fromUrl || (stored === 'en' ? stored : 'da');

  window.CW_LANG = LANG;
  document.documentElement.lang = LANG;

  window.I18N = { en: {}, sv: {} };

  window.t = function (s) {
    if (LANG === 'da') return s;
    var d = window.I18N[LANG];
    if (d && Object.prototype.hasOwnProperty.call(d, s)) return d[s];
    return s;
  };

  window.setLang = function (lang) {
    if (lang !== 'da' && lang !== 'en') return;
    try { localStorage.setItem('cw_lang', lang); } catch (e) {}
    location.reload();
  };
})();

// Kerneordbog: shell + app. Ordbøger for de øvrige filer ligger i
// src/i18n_dictionaries.js og flettes ind ovenpå.
Object.assign(window.I18N.en, {
  'Kreditafdeling': 'Credit department',
  'Ny sag': 'New case',
  'Mine opgaver': 'My tasks',
  'Porteføljeanalyse': 'Portfolio analysis',
  'Indhentningsflow': 'Collection flow',
  'Indstillinger': 'Settings',
  'Kreditmedarbejder': 'Credit officer',
  'Notifikationer': 'Notifications',
  'Hjælp': 'Help',
  'Søg kunde - navn eller CVR': 'Search customer - name or CVR',
  'Søg kunde': 'Search customer',
  'Ryd': 'Clear',
  'Seneste sager': 'Recent cases',
  'Ingen sager matcher': 'No cases match',
  'Sprog': 'Language',
  'Indbakke': 'Inbox',
  'Notifikationer, kundebeskeder og påmindelser om frister': 'Notifications, customer messages and deadline reminders',
  'Skabeloner': 'Templates',
  'Memo-skabeloner, datapakker, spørgsmålssæt': 'Memo templates, data packages, question sets',
  'Rapporter': 'Reports',
  'Portefølje, resultater og revisionsspor': 'Portfolio, performance and audit trail',
  'Team, integrationer, branding': 'Team, integrations, branding',
  'Denne sektion er en del af det fulde produkt': 'This section is part of the full product',
  'Prototypen viser sagsflowet og selve sagen': 'The prototype covers the case flow and the case itself',
  'Brugermenu': 'User menu',
  'Menuen (…) ved sagen i Mine opgaver giver sagen til en anden rådgiver.': 'The menu (…) next to the case in My tasks hands the case to another adviser.',
  'Nederst i menuen til venstre og i menuen under dit navn. Sletter alt, demoen har gemt, og starter forfra.': 'At the bottom of the menu on the left and in the menu under your name. Deletes everything the demo has saved and starts over.',
});

Object.assign(window.I18N.sv, {
  'Kreditafdeling': 'Kreditavdelning',
  'Ny sag': 'Nytt ärende',
  'Mine opgaver': 'Mina uppgifter',
  'Porteføljeanalyse': 'Portföljanalys',
  'Indhentningsflow': 'Inhämtningsflöde',
  'Indstillinger': 'Inställningar',
  'Kreditmedarbejder': 'Kredithandläggare',
  'Notifikationer': 'Notiser',
  'Hjælp': 'Hjälp',
  'Søg kunde - navn eller CVR': 'Sök kund - namn eller CVR',
  'Søg kunde': 'Sök kund',
  'Ryd': 'Rensa',
  'Seneste sager': 'Senaste ärenden',
  'Ingen sager matcher': 'Inga ärenden matchar',
  'Sprog': 'Språk',
  'Indbakke': 'Inkorg',
  'Notifikationer, kundebeskeder og påmindelser om frister': 'Notiser, kundmeddelanden och påminnelser om tidsfrister',
  'Skabeloner': 'Mallar',
  'Memo-skabeloner, datapakker, spørgsmålssæt': 'PM-mallar, datapaket, frågeuppsättningar',
  'Rapporter': 'Rapporter',
  'Portefølje, resultater og revisionsspor': 'Portfölj, resultat och verifieringskedja',
  'Team, integrationer, branding': 'Team, integrationer, varumärke',
  'Denne sektion er en del af det fulde produkt': 'Den här sektionen är en del av den fullständiga produkten',
  'Prototypen viser sagsflowet og selve sagen': 'Prototypen visar ärendeflödet och själva ärendet',
});

// Kerneordbog: menu, topbar og tilgængelighed (data/navigation-rettelser)
Object.assign(window.I18N.en, {
  "Hovedmenu": "Main menu",
  "Brødkrumme": "Breadcrumb",
  "Spring til indhold": "Skip to content",
  "sager afventer dig": "cases waiting for you",
  "sidder fast (ingen aktivitet i 3 hverdage)": "stuck (no activity for 3 working days)",
  "Søg sag": "Search case",
  "Søg sag - navn, CVR eller sagsnr.": "Search case - name, CVR or case no.",
  "Sager": "Cases",
  "Dataanmodninger": "Data requests",
  "Ryd søgning": "Clear search",
  "Ansvarlig": "Owner",
});

// Runde 3 (data og team)
Object.assign(window.I18N.en, {
  "Nulstil demoen?": "Reset the demo?",
  "Sagens fase, anmodningen, uploads, godkendelser, memoet, kommentarer og omfordelinger slettes. Sprog og skærm bevares.": "The case stage, the request, uploads, approvals, the memo, comments and reassignments are deleted. Language and screen are kept.",
  "Nulstil demo": "Reset demo",
  "Sletter alt, demoen har gemt, og starter forfra": "Deletes everything the demo has saved and starts over",
  "Notifikationer": "Notifications",
  "ny": "new",
  "nye": "new",
  "Markér som læst": "Mark as read",
  "Ingen nye hændelser fra kunderne.": "No new events from customers.",
  "Tidligere": "Earlier",
  "Her kommer det, kunden gør i sin portal: leveringer, spørgsmål, indsendelse og adgang til regnskabssystemet.": "This is where you see what the customer does in their portal: deliveries, questions, submission and access to the accounting system.",
  "Sådan arbejder du med en sag": "How to work on a case",
  "Luk hjælp": "Close help",
  "Sagens faser": "Case stages",
  "Hvad knapperne gør": "What the buttons do",
  "Demoen gemmer alt i browseren, også ved genindlæsning og sprogskift. Kun Nordhavn Composite (sag 2026-0184) er udfyldt med data.": "The demo saves everything in the browser, including across reloads and language changes. Only Nordhavn Composite (case 2026-0184) is filled in with data.",
  "Du gennemgår de offentlige data (CVR og årsrapporter) og beslutter, hvad kunden skal sende.": "You review the public data (CVR and annual reports) and decide what the customer should send.",
  "Du vælger punkterne i anmodningen. Kunden ser intet, før du sender.": "You choose the items in the request. The customer sees nothing until you send it.",
  "Kunden uploader i sin portal. Klokken giver besked, når der sker noget.": "The customer uploads in their portal. The bell tells you when something happens.",
  "Du godkender eller afviser hvert leveret punkt. Et afvist punkt går tilbage til kunden med din note.": "You approve or reject each delivered item. A rejected item goes back to the customer with your note.",
  "Materialet er godkendt. Memoets afsnit skrives og gennemgås.": "The material is approved. The memo sections are written and reviewed.",
  "Klarhedstjekket er grønt, og sagen kan indstilles.": "The readiness check is green and the case can be submitted.",
  "Memoet er låst som en version og ligger hos kreditkomitéen. Skal noget ændres, trækkes indstillingen tilbage med en årsag.": "The memo is locked as a version and is with the credit committee. To change anything, the submission is withdrawn with a reason.",
  "Komitéen har truffet afgørelse. Afslag kan gives i alle faser før indstilling og kræver en årsag.": "The committee has decided. A decline can be given at any stage before submission and requires a reason.",
  "Godkend og Afvis": "Approve and Reject",
  "Flyt sagen": "Reassign the case",
  "Åbner materialevalget. Når punkterne er valgt, sender samme knap anmodningen til kunden med frist og et link til portalen.": "Opens material selection. Once the items are chosen, the same button sends the request to the customer with a deadline and a link to the portal.",
  "Sender ændringer til en anmodning, som kunden allerede har fået.": "Sends changes to a request the customer has already received.",
  "Sender en påmindelse om de punkter, der mangler. Den står i sagens historik og på Dataanmodninger.": "Sends a reminder about the missing items. It shows in the case history and on Data requests.",
  "Tager stilling til et leveret punkt. Afvis kræver en note til kunden.": "Decides on a delivered item. Reject requires a note to the customer.",
  "Viser portalen, som kunden ser den.": "Shows the portal as the customer sees it.",
  "Kører klarhedstjekket, låser memoet og gemmer den indstillede version.": "Runs the readiness check, locks the memo and saves the submitted version.",
  "Menuen på sagskortet i Mine opgaver giver sagen til en anden rådgiver.": "The menu on the case card in My tasks hands the case to another adviser.",
  "Nederst i menuen til venstre. Sletter alt, demoen har gemt, og starter forfra.": "At the bottom of the menu on the left. Deletes everything the demo has saved and starts over.",
  "Kundeportal": "Customer portal",
  "Memo skrives": "Memo in progress",
});

// Modul-eksport: sproget skiftes med fuld genindlæsning, så værdierne er faste i en session
export const t = window.t;
export const setLang = window.setLang;
export const lang = window.CW_LANG;
