// Oplysning om AI til kunden (9. oktober 2026, Jesper: AI-forordningen i kundeflowet).
//
// Hvad reglerne kræver (læst 9. oktober 2026):
// - AI-forordningen (EU 2024/1689) kræver ikke samtykke, men tydelig information. Oplysninger til
//   personer skal gives "klart og letgenkendeligt, senest ved første interaktion eller eksponering"
//   og være tilgængelige (art. 50, stk. 5).
// - Kreditvurdering af virksomheder er ikke højrisiko: bilag III, punkt 5(b), gælder kun fysiske
//   personer. Bruges AI til at vurdere en fysisk person (f.eks. en personlig kautionist), skal den
//   person have besked (art. 26, stk. 11) og kan kræve en forklaring (art. 86), når reglerne for
//   højrisiko gælder (udskudt til 2. december 2027 med omnibus-aftalen).
// - GDPR: samtykke er ikke frit i en låneansøgning og bør ikke være grundlaget. Kunden skal i stedet
//   oplyses (art. 13/14), og ingen afgørelse må træffes alene af AI (art. 22). Derfor er det her en
//   oplysning, kunden kvitterer for, adskilt fra brugsvilkårene, ikke et samtykke.
//
// Hvor: et skærmbillede i portalen lige efter trinnet Bruger (første eksponering: før kunden sender
// materiale, som AI læser), og en kort linje på hvert uploadpunkt. Eksisterende kunder, der ikke har
// kvitteret for den gældende version, får skærmbilledet ved næste login. En ny version af teksten
// (AI_NOTICE_VERSION) kræver en ny kvittering.
//
// Gemmes i kundens opstart: CW.onboarding().aiNotice = { version, at, by }.

const AI_NOTICE_VERSION = '2026-10-09';

/** Har kunden kvitteret for den gældende oplysning om AI? */
function aiNoticeDone(ob) {
  const a = ob && ob.aiNotice;
  return !!(a && a.version === AI_NOTICE_VERSION);
}

/** Kunden kvitterer. by: navnet på den, der er logget ind. Skrives i sagens historik. */
function aiNoticeAccept(by) {
  const now = new Date().toISOString();
  const prev = (CW.onboarding() || {}).aiNotice;
  return CW.setOnboarding({ aiNotice: { version: AI_NOTICE_VERSION, at: now, by: by || '' } },
    (prev ? t('Kunden har læst den opdaterede oplysning om AI') : t('Kunden har læst oplysningen om, hvordan materialet læses af AI')) + ' (' + AI_NOTICE_VERSION + ')');
}

// Oplysningens afsnit (danske nøgler; skærmen oversætter dem). {adv} er rådgiverens fornavn.
const AI_NOTICE_TEXT = [
  'Når I sender materiale, læser en AI-model filerne og henter tallene ud, f.eks. omsætning og omkostninger fra årsrapporter, saldobalancer og budgetter. Tal fra jeres regnskabssystem læses uden AI.',
  'AI kan tage fejl. Jeres rådgiver hos EIFO kontrollerer tallene, og det er altid en medarbejder, der vurderer sagen og træffer beslutningen. AI træffer ingen afgørelser om jer.',
  'Tal, som AI har læst, er mærket i sagen, så rådgiveren kan se, hvor de kommer fra, og rette dem.',
  'Har I spørgsmål til, hvordan vi bruger AI, eller indvendinger, så skriv til {adv}.',
];

export { AI_NOTICE_VERSION, AI_NOTICE_TEXT, aiNoticeDone, aiNoticeAccept };
