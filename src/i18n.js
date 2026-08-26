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
  'Notifikationer, kundebeskeder, deadline-påmindelser': 'Notifications, customer messages, deadline reminders',
  'Skabeloner': 'Templates',
  'Memo-skabeloner, datapakker, spørgsmålssæt': 'Memo templates, data packages, question sets',
  'Rapporter': 'Reports',
  'Portefølje, performance, audit trail': 'Portfolio, performance, audit trail',
  'Team, integrationer, branding': 'Team, integrations, branding',
  'Denne sektion er en del af det fulde produkt': 'This section is part of the full product',
  'Prototypen fokuserer på sagsflow og workspace': 'The prototype focuses on case flow and workspace',
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
  'Notifikationer, kundebeskeder, deadline-påmindelser': 'Notiser, kundmeddelanden, deadline-påminnelser',
  'Skabeloner': 'Mallar',
  'Memo-skabeloner, datapakker, spørgsmålssæt': 'PM-mallar, datapaket, frågeuppsättningar',
  'Rapporter': 'Rapporter',
  'Portefølje, performance, audit trail': 'Portfölj, performance, audit trail',
  'Team, integrationer, branding': 'Team, integrationer, varumärke',
  'Denne sektion er en del af det fulde produkt': 'Den här sektionen är en del av den fullständiga produkten',
  'Prototypen fokuserer på sagsflow og workspace': 'Prototypen fokuserar på ärendeflöde och arbetsyta',
});
