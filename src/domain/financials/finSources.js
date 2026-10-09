// Fanen Virksomheden, Regnskab (v5): kilderne bag tallene, og hvordan de er læst.
//   Årsrapporter: offentlige fra CVR (kun bruttofortjenesten er offentlig, jf. ÅRL § 32) eller
//                 interne fra kunden (omsætning, vareforbrug og andre eksterne omkostninger,
//                 læst af AI). Pr. år, fordi en intern årsrapport også dækker sammenligningsåret.
//   Periodetal:   saldobalance fra ERP (e-conomic via Crediwires mapper, uden AI), uploadet
//                 saldobalance (PDF eller regneark, læst af AI) eller ingen.
//   Budget:       kundens budget (læst og mappet af AI) eller intet. Budgettet dækker hele
//                 regnskabsår (Jespers beslutning 8. oktober 2026).
// finSourceState() læser sagens tilstand (CW). Kundeportalens demoknapper skriver den samme
// tilstand med CW's egne funktioner, så Regnskab reagerer, som hvis kunden selv havde gjort det.
// Demoknapperne ved tabellen ændrer kun visningen (finApplySourceOverride); intet gemmes.
import { FIN_ANNUAL_YEARS } from './finData.js';
import { FIN_EDIT_COL, finLoadEdits } from './finEdits.js';
import { finActiveEdits, finAdviserActive } from './finVersions.js';
import { finFill } from './finFormat.js';

/** Er punktet leveret: modtaget eller godkendt, med filer eller hentet fra regnskabssystemet. */
function finDelivered(s) {
  return !!s && (s.status === 'received' || s.status === 'approved') && ((s.files || []).length > 0 || s.noteKind === 'system');
}

/* Kilderne efter sagens tilstand:
   internal  [bool pr. år i FIN_ANNUAL_YEARS]: en intern årsrapport dækker året.
             'm-annual' (de to seneste årsregnskaber) dækker alle tre år; 'm-annual-<år>'
             dækker året og sammenligningsåret før.
   period    'erp' | 'upload' | 'none'. ERP, når kunden har forbundet regnskabssystemet, eller
             når periodetallene er hentet derfra (også efter en tilbagetrukket adgang: tallene er
             stadig hentet, på punktet Periodetal eller som andre filer, når det ikke er bedt om).
             Ellers 'upload', når kunden har sendt en saldobalance.
   budget    kundens budget er leveret, eller rådgiveren har importeret et budget (Excel).
   budgetSource 'customer' (kundens fil, læst af AI) | 'import' (rådgiverens version: Excel-import,
             evt. bygget på kundens budget, finVersions.js) | null
   customerBudget kunden har sendt sit budget (også når rådgiverens version er den aktive)
   dataUntil 'YYYY-MM' eller null: kunden deler kun tal til og med denne måned.
   requested { annual, period, budget }: punktet står i den sendte anmodning. */
// Filerne, hentningen fra regnskabssystemet lægger som andre filer (portalConnectNow)
const FIN_ERP_FILE_RE = /^(Saldobalance|Debitorliste)_.+\.csv$/;
/* Interne årsrapporter, kunden har sendt som andre filer, når Årsregnskaber ikke er bedt om
   (kundeportalens demoknap gør det samme). Prototypen kender dem på navnet, som demofilerne har
   (Intern_aarsrapport_<år>.pdf); i produktet læser AI'en filen. → FileMeta[] */
const FIN_INTERNAL_FILE_RE = /^Intern_aarsrapport_(\d{4})\.pdf$/i;
function finInternalLoose() {
  return window.CW && CW.allUploads ? CW.allUploads().filter(f => !f.itemId && f.by === 'kunde' && FIN_INTERNAL_FILE_RE.test(f.name || '')) : [];
}
function finSourceState() {
  const st = (id) => (window.CW && CW.itemState ? CW.itemState(id) : null);
  const consent = window.CW && CW.consent ? CW.consent() : null;
  const internal = FIN_ANNUAL_YEARS.map(() => false);
  if (finDelivered(st('m-annual'))) internal.fill(true);
  const cover = (i) => {
    if (i < 0) return;
    internal[i] = true;
    if (i > 0) internal[i - 1] = true;
  };
  FIN_ANNUAL_YEARS.forEach((y, i) => { if (finDelivered(st('m-annual-' + y))) cover(i); });
  finInternalLoose().forEach(f => cover(FIN_ANNUAL_YEARS.indexOf(FIN_INTERNAL_FILE_RE.exec(f.name)[1])));
  const interim = st('m-interim');
  const fetchedLoose = !!(window.CW && CW.allUploads) && CW.allUploads().some(f => !f.itemId && f.by === 'kunde' && FIN_ERP_FILE_RE.test(f.name || ''));
  const period = consent || (finDelivered(interim) && interim.noteKind === 'system') ? 'erp'
    : finDelivered(interim) ? 'upload' : fetchedLoose ? 'erp' : 'none';
  // Et budget, rådgiveren har importeret (Excel-skabelonen for hele regnskabsår, kolonnerne by0-by2).
  // Ældre importer af kvartaler tæller ikke: de dækker ikke hele år
  const imported = finActiveEdits(finLoadEdits()).some(x => FIN_EDIT_COL[x.colKey] && FIN_EDIT_COL[x.colKey].kind === 'by' && /^Excel-import/.test(x.reason || ''));
  const customerBudget = finDelivered(st('m-budget'));
  const budget = customerBudget || imported;
  // Rådgiverens version er aktiv: den er budgettet, også når kunden har sendt sit (finVersions.js)
  const adviser = imported && (!customerBudget || finAdviserActive('m-budget'));
  const dataUntil = consent && consent.dataUntil ? String(consent.dataUntil).slice(0, 7) : null;
  // Står punktet i den sendte anmodning (kunden er bedt om det)? Båndene viser så "Anmodet", ikke "Anmod"
  const sent = window.CW && CW.request ? CW.request() : null;
  const asked = (re) => !!(sent && Array.isArray(sent.items) && sent.items.some(id => re.test(id)));
  const requested = { annual: asked(/^m-annual(-\d{4})?$/), period: asked(/^m-interim$/), budget: asked(/^m-budget$/) };
  return { internal, period, budget, budgetSource: adviser ? 'import' : customerBudget ? 'customer' : null, customerBudget,
    dataUntil, estBy: 'cw', edge: null, demo: false, requested };
}

/* Demoknapperne ved tabellen: en visning af andre kilder, uden at sagen ændres.
   ov = { annual: 'public' | 'internal', period: 'none' | 'erp' | 'upload', budget: bool,
          estBy: 'cw' | 'cust', edge: null | { fy: 'cal' | 'jj', book: 3 | 8 | 12 | 15 } }
   edge er kanttilfældene fra designet (regnskabsår og bogført til), der vises med eksempeldata. */
function finApplySourceOverride(real, ov) {
  if (!ov) return real;
  return {
    internal: FIN_ANNUAL_YEARS.map(() => ov.annual === 'internal'),
    period: ov.period,
    budget: !!ov.budget,
    budgetSource: ov.budget ? 'customer' : null,
    dataUntil: null,
    estBy: ov.estBy || 'cw',
    edge: ov.edge || null,
    demo: true,
  };
}

/** Udgangspunktet for demoknapperne: sagens kilder som demotilstand. */
function finOverrideFrom(real) {
  return {
    annual: real.internal.some(Boolean) ? 'internal' : 'public',
    period: real.period,
    budget: !!real.budget,
    estBy: real.estBy || 'cw',
    edge: null,
  };
}

/* "Bogført til og med" (ERP): Crediwire vurderer måneden ud fra bogføringen (den sidste måned med
   tal); rådgiveren kan vælge en anden. Valget gemmes pr. sag og står i sagens historik (designet:
   "The advisor may change it (the change should be logged)"). Nulstil demo sletter det (kabul:).
   { to: 'YYYY-MM', by, at } eller null = vurderingen. */
const FIN_PERIOD_KEY = 'kabul:fin-period:nordhavn';
function finLoadPeriod() {
  try {
    const v = JSON.parse(localStorage.getItem(FIN_PERIOD_KEY) || 'null');
    return v && typeof v.to === 'string' && /^\d{4}-\d{2}$/.test(v.to) ? v : null;
  } catch (e) { return null; }
}
/** Gemmer rådgiverens valg (toKey 'YYYY-MM', eller null = tilbage til vurderingen) og skriver det i
 *  historikken: fromLabel og toLabel er perioderne, som de står i tabellen ("Jan-aug 2026"). */
function finStorePeriod(toKey, fromLabel, toLabel) {
  try {
    if (toKey) localStorage.setItem(FIN_PERIOD_KEY, JSON.stringify({ to: toKey, by: (window.DATA && DATA.ADVISOR && DATA.ADVISOR.name) || '', at: new Date().toISOString() }));
    else localStorage.removeItem(FIN_PERIOD_KEY);
  } catch (e) {}
  if (window.CW && CW.log) {
    const text = toKey
      ? finFill(t('Periodetal: bogført til og med ændret fra {fra} til {til}'), { fra: fromLabel, til: toLabel })
      : finFill(t('Periodetal: bogført til og med sat tilbage til vurderingen ({til})'), { til: toLabel });
    CW.log('fin-period', text, { who: 'rådgiver', data: { to: toKey } });
  } else if (window.CW && CW.bump) CW.bump();
}

// Kilden i grafens detaljefelt og i kildelinjen (danske nøgler; skærmen oversætter dem)
const FIN_SOURCE_LABEL = {
  public: 'Offentlig årsrapport',
  internal: 'Intern årsrapport',
  erp: 'Saldobalance, ERP',
  upload: 'Saldobalance, upload',
  budget: 'Budget fra kunden',
  adviser: 'Rådgiverens version af kundens budget',
  import: 'Budget importeret af rådgiveren',
  none: 'Ikke modtaget',
};

// Forklaringerne ved AI-mærkerne i båndene over tabellen
const FIN_AI_TIP = {
  annual: 'Omsætning, vareforbrug og andre eksterne omkostninger er læst af AI fra den interne årsrapport. Den offentlige årsrapport viser kun bruttofortjenesten.',
  upload: 'Saldobalancen er uploadet og læst af AI.',
  budget: 'Budgettet er læst og mappet af AI.',
};

// Modul-eksport
export {
  finDelivered, finInternalLoose, finSourceState, finApplySourceOverride, finOverrideFrom,
  FIN_PERIOD_KEY, finLoadPeriod, finStorePeriod, FIN_SOURCE_LABEL, FIN_AI_TIP,
};
