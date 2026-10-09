/* ─────────────────────────────────────────────────────────────────────────
   Kontomapping (window.CW_MAP)
   Kundens saldobalance fra e-conomic ligger som Excel i
   data/Saldobalance_e-conomic_jan-aug_2026.xlsx: kontonr., kontonavn,
   kontotype, primo og ét beløb pr. måned. Hver drifts- og statuskonto mappes
   til en Crediwire-kategori, og kategorierne peger på en række (og evt. en
   detaljelinje) i Regnskab under Virksomheden (FIN_LAYOUT i financials.jsx).
   compute() lægger beløbene sammen pr. række for de tre realiserede perioder
   (Q1, Q2 og jul-aug 2026). financials.jsx skriver dem ind i tabellen, når
   filen er hentet, og hver gang mappingen gemmes ('cw-mapping-changed').

   Fortegn: e-conomic har debet plus og kredit minus. Tabellen har indtægter
   og aktiver plus, omkostninger minus og passiver plus, så driftskonti og
   passiver vendes.
   Standardmappingen er den, Crediwire laver automatisk ud fra kontonummer og
   navn. Rådgiverens ændringer gemmes i localStorage (KEY) og nulstilles med
   "Nulstil demo".
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  var FILE = '/data/Saldobalance_e-conomic_jan-aug_2026.xlsx';
  var FILE_NAME = 'Saldobalance_e-conomic_jan-aug_2026.xlsx';
  var KEY = 'kabul:mapping:nordhavn';
  var EVENT = 'cw-mapping-changed';
  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

  // De realiserede perioder i regnskabstabellen (FIN_ACTUAL_Q). Månederne er nøgler
  // ('2026-01'), ikke kolonnepositioner, så arket kan have flere måneder eller en
  // anden rækkefølge; mangler en af dem, melder parse() fejl.
  var PERIODS = [
    { key: 'q0', label: 'Q1 2026', months: ['2026-01', '2026-02', '2026-03'] },
    { key: 'q1', label: 'Q2 2026', months: ['2026-04', '2026-05', '2026-06'] },
    { key: 'q2', label: 'Jul-aug 2026', months: ['2026-07', '2026-08'] },
  ];
  var NEEDED = PERIODS.reduce(function (a, p) { return a.concat(p.months); }, []);

  /* Crediwire-kategorierne: opgørelse ('pl' resultat, 'bs' balance), gruppe,
     undergruppe, id, navn og målet i regnskabstabellen (række i FIN_LAYOUT og
     evt. detaljelinje). side: 'A' aktiv, 'P' passiv (kun balancen). */
  var GROUPS = [
    { stmt: 'pl', label: 'Omsætning', subs: [
      ['Indenlandsk', [['oms_dk_m', 'Omsætning (indenlandsk) m/moms'], ['oms_dk_u', 'Omsætning (indenlandsk) u/moms']], 'Omsætning i alt', 'Salg af varer og tjenesteydelser'],
      ['Udenlandsk', [['oms_eu_m', 'Omsætning (EU) m/moms'], ['oms_eu_u', 'Omsætning (EU) u/moms'], ['oms_w_m', 'Omsætning (verden) m/moms'], ['oms_w_u', 'Omsætning (verden) u/moms']], 'Omsætning i alt', 'Salg af varer og tjenesteydelser'],
      ['Igangværende arbejde', [['oms_iga_m', 'Igangværende arbejde m/moms'], ['oms_iga_u', 'Igangværende arbejde u/moms']], 'Omsætning i alt', 'Salg af varer og tjenesteydelser'],
      ['Lejeindtægter', [['oms_leje_m', 'Lejeindtægter m/moms'], ['oms_leje_u', 'Lejeindtægter u/moms']], 'Omsætning i alt', 'Huslejeindtægter'],
      ['Ikke specificerede', [['oms_other', 'Øvrige indtægter']], 'Omsætning i alt', 'Øvrige indtægter'],
    ] },
    { stmt: 'pl', label: 'Vareforbrug', subs: [
      ['Indenlandsk', [['vf_dk_m', 'Vareforbrug (indenlandsk) m/moms'], ['vf_dk_u', 'Vareforbrug (indenlandsk) u/moms']], 'Vareforbrug/Produktionsomkostninger'],
      ['Udenlandsk', [['vf_eu', 'Vareforbrug (EU)'], ['vf_w', 'Vareforbrug (verden)']], 'Vareforbrug/Produktionsomkostninger'],
      ['Fremmed arbejde', [['vf_sub', 'Fremmed arbejde og underleverandører']], 'Vareforbrug/Produktionsomkostninger'],
      ['Fragt og emballage', [['vf_freight', 'Fragt, told og emballage']], 'Vareforbrug/Produktionsomkostninger'],
      ['Lagerregulering', [['vf_inv', 'Lagerregulering']], 'Vareforbrug/Produktionsomkostninger'],
    ] },
    { stmt: 'pl', label: 'Personaleomkostninger', subs: [
      ['Løn', [['p_salary', 'Lønninger'], ['p_holiday', 'Feriepenge']], 'Personaleomkostninger'],
      ['Pension og sociale bidrag', [['p_pension', 'Pension'], ['p_social', 'ATP, AER og sociale bidrag']], 'Personaleomkostninger'],
      ['Øvrige', [['p_other', 'Øvrige personaleomkostninger'], ['p_refund', 'Lønrefusioner']], 'Personaleomkostninger'],
    ] },
    { stmt: 'pl', label: 'Faste omkostninger', subs: [
      ['Lokaler', [['f_rent', 'Husleje'], ['f_util', 'El, vand og varme'], ['f_maint', 'Vedligeholdelse af lokaler']], 'Andre eksterne omkostninger'],
      ['Salg og rejser', [['f_ads', 'Annoncering og reklame'], ['f_fairs', 'Messer og udstillinger'], ['f_travel', 'Rejser'], ['f_repr', 'Repræsentation']], 'Andre eksterne omkostninger'],
      ['Administration', [['f_office', 'Kontorhold'], ['f_it', 'IT og software'], ['f_phone', 'Telefon og internet'], ['f_audit', 'Revision og regnskab'], ['f_legal', 'Advokat og rådgivning'], ['f_ins', 'Forsikringer'], ['f_small', 'Småanskaffelser'], ['f_fees', 'Porto og gebyrer']], 'Andre eksterne omkostninger'],
      ['Biler', [['f_car', 'Bilomkostninger'], ['f_carlease', 'Leasing af biler']], 'Andre eksterne omkostninger'],
    ] },
    { stmt: 'pl', label: 'Andre driftsposter', subs: [
      ['Indtægter', [['od_inc', 'Andre driftsindtægter']], 'Andre driftsindtægter'],
      ['Omkostninger', [['od_exp', 'Andre driftsomkostninger']], 'Andre driftsomkostninger'],
    ] },
    { stmt: 'pl', label: 'Afskrivninger og nedskrivninger', subs: [
      ['Immaterielle', [['d_immat', 'Af- og nedskrivninger, immaterielle anlægsaktiver']], 'Årets af- og nedskrivninger i alt', 'Af- og nedskr. immaterielle anlægsaktiver'],
      ['Materielle', [['d_build', 'Afskrivninger, bygninger'], ['d_mach', 'Afskrivninger, produktionsanlæg og maskiner'], ['d_equip', 'Afskrivninger, driftsmateriel og inventar']], 'Årets af- og nedskrivninger i alt', 'Af- og nedskr. materielle anlægsaktiver'],
      ['Avance og tab', [['d_gain', 'Gevinst/tab ved salg af anlægsaktiver']], 'Årets af- og nedskrivninger i alt', 'Gevinst/tab ved salg af anlægsaktiver'],
    ] },
    { stmt: 'pl', label: 'Finansielle poster', subs: [
      ['Indtægter', [['fi_int', 'Renteindtægter']], 'Netto finansielle poster', 'Øvrige finansielle indtægter'],
      ['Omkostninger', [['fe_bank', 'Renteomkostninger, bank'], ['fe_mort', 'Renteomkostninger, realkredit'], ['fe_lease', 'Renteomkostninger, leasing'], ['fe_owner', 'Renter, gæld til ejere'], ['fe_fx', 'Valutakursreguleringer'], ['fe_fees', 'Bankgebyrer']], 'Netto finansielle poster', 'Øvrige finansielle omkostninger'],
    ] },
    { stmt: 'pl', label: 'Ekstraordinære poster', subs: [
      ['Indtægter', [['ex_inc', 'Ekstraordinære indtægter']], 'Andre driftsindtægter'],
      ['Omkostninger', [['ex_exp', 'Ekstraordinære omkostninger']], 'Andre driftsomkostninger'],
    ] },
    { stmt: 'pl', label: 'Skat', subs: [
      ['Skat', [['tax_year', 'Skat af årets resultat']], 'Skat af årets resultat i alt', 'Skat af årets resultat'],
      ['Udskudt skat', [['tax_def', 'Regulering af udskudt skat']], 'Skat af årets resultat i alt', 'Årets regulering af udskudt skat'],
    ] },
    { stmt: 'pl', label: 'Foreslået udbytte', subs: [
      ['Udbytte', [['div', 'Foreslået udbytte']], 'Foreslået udbytte inkl. eks. ord. udbytte'],
    ] },
    { stmt: 'bs', side: 'A', label: 'Immaterielle anlægsaktiver', subs: [
      ['Goodwill', [['a_goodwill', 'Goodwill']], 'Immaterielle anlægsaktiver i alt', 'Goodwill'],
      ['Øvrige', [['a_dev', 'Udviklingsprojekter'], ['a_soft', 'Software og rettigheder']], 'Immaterielle anlægsaktiver i alt', 'Øvrige immaterielle anlægsaktiver'],
    ] },
    { stmt: 'bs', side: 'A', label: 'Materielle anlægsaktiver', subs: [
      ['Ejendomme', [['a_build', 'Grunde og bygninger']], 'Materielle anlægsaktiver i alt', 'Grunde og bygninger'],
      ['Lejede lokaler', [['a_lease_impr', 'Indretning af lejede lokaler']], 'Materielle anlægsaktiver i alt', 'Indretning af lejede lokaler'],
      ['Produktion', [['a_mach', 'Produktionsanlæg og maskiner']], 'Materielle anlægsaktiver i alt', 'Produktionsanlæg og maskiner'],
      ['Driftsmateriel', [['a_equip', 'Andre anlæg, driftsmateriel og inventar']], 'Materielle anlægsaktiver i alt', 'Andre anlæg, driftsmateriel og inventar'],
      ['Under udførelse', [['a_wip', 'Anlæg under udførelse']], 'Materielle anlægsaktiver i alt', 'Materielle anlægsaktiver under udførelse'],
    ] },
    { stmt: 'bs', side: 'A', label: 'Finansielle anlægsaktiver', subs: [
      ['Kapitalandele', [['a_subs', 'Kapitalandele i tilknyttede virksomheder']], 'Finansielle anlægsaktiver i alt', 'Kap. andele i tilkn. virksomheder'],
      ['Tilgodehavender', [['a_dep', 'Deposita'], ['a_ltrec', 'Andre langfristede tilgodehavender']], 'Finansielle anlægsaktiver i alt', 'Andre tilgodehavender (langfristet)'],
    ] },
    { stmt: 'bs', side: 'A', label: 'Varebeholdninger', subs: [
      ['Varelager', [['inv_raw', 'Råvarer og hjælpematerialer'], ['inv_wip', 'Varer under fremstilling'], ['inv_fin', 'Færdigvarer og handelsvarer']], 'Varebeholdninger i alt', 'Varebeholdninger'],
    ] },
    { stmt: 'bs', side: 'A', label: 'Tilgodehavender', subs: [
      ['Debitorer', [['r_trade', 'Tilgodehavender fra salg (debitorer)']], 'Tilgodehavender i alt', 'Tilgodehavender fra salg af tjenesteydelser'],
      ['Igangværende arbejder', [['r_wip', 'Igangværende arbejder for fremmed regning']], 'Tilgodehavender i alt', 'Igangværende arbejder'],
      ['Øvrige', [['r_other', 'Andre tilgodehavender'], ['r_vat', 'Tilgodehavende moms']], 'Tilgodehavender i alt', 'Andre tilgodehavender (kortfristet)'],
      ['Skat', [['r_tax', 'Tilgodehavende selskabsskat']], 'Tilgodehavender i alt', 'Tilgodehavende selskabsskat'],
      ['Periodeafgrænsning', [['r_prep', 'Periodeafgrænsningsposter']], 'Tilgodehavender i alt', 'Periodeafgrænsningsposter (aktiver)'],
    ] },
    { stmt: 'bs', side: 'A', label: 'Likvide beholdninger', subs: [
      ['Likvider', [['l_bank', 'Bank'], ['l_cash', 'Kasse']], 'Likvide beholdninger'],
    ] },
    { stmt: 'bs', side: 'P', label: 'Egenkapital', subs: [
      ['Egenkapital', [['e_cap', 'Selskabskapital'], ['e_ret', 'Overført resultat'], ['e_other', 'Øvrige reserver']], 'Egenkapital'],
    ] },
    { stmt: 'bs', side: 'P', label: 'Hensatte forpligtelser', subs: [
      ['Udskudt skat', [['h_def', 'Udskudt skat']], 'Hensatte forpligtelser i alt', 'Hensættelser til udskudt skat'],
      ['Øvrige', [['h_other', 'Andre hensatte forpligtelser']], 'Hensatte forpligtelser i alt', 'Andre hensatte forpligtelser'],
    ] },
    { stmt: 'bs', side: 'P', label: 'Langfristet gæld', subs: [
      ['Realkredit', [['lg_mort', 'Gæld til realkreditinstitutter']], 'Langfristet gæld i alt', 'Gæld til realkreditinstutter'],
      ['Bank', [['lg_bank', 'Gæld til kreditinstitutter']], 'Langfristet gæld i alt', 'Gæld til kreditinsitutter (langfristet)'],
      ['Leasing', [['lg_lease', 'Leasingforpligtelser']], 'Langfristet gæld i alt', 'Leasingforpligtelser'],
      ['Ansvarlig lånekapital', [['lg_sub', 'Ansvarlig lånekapital']], 'Langfristet gæld i alt', 'Ansvarlig lånekapital'],
      ['Øvrige', [['lg_owner', 'Anden gæld, rentebærende']], 'Langfristet gæld i alt', 'Anden gæld - rentebærende'],
    ] },
    { stmt: 'bs', side: 'P', label: 'Kortfristet gæld', subs: [
      ['Bank', [['kg_bank', 'Kassekredit og kortfristet bankgæld']], 'Kortfristet gæld i alt', 'Gæld til kreditinsitutter (kortfristet)'],
      ['Afdrag', [['kg_cur', 'Kortfristet del af langfristet gæld']], 'Kortfristet gæld i alt', 'Kortfristet del af langfristet gæld'],
      ['Leverandører', [['kg_trade', 'Leverandører af varer og tjenesteydelser']], 'Kortfristet gæld i alt', 'Leverandører af varer og tjenesteydelser'],
      ['Forudbetalinger', [['kg_prepay', 'Modtagne forudbetalinger']], 'Kortfristet gæld i alt', 'Modtagne forudbetalinger'],
      ['Skat', [['kg_tax', 'Skyldig selskabsskat']], 'Kortfristet gæld i alt', 'Skyldig selskabsskat'],
      ['Anden gæld', [['kg_payroll', 'Skyldig A-skat og AM-bidrag'], ['kg_holiday', 'Skyldige feriepenge'], ['kg_vat', 'Skyldig moms og afgifter'], ['kg_other', 'Anden kortfristet gæld']], 'Kortfristet gæld i alt', 'Anden gæld'],
    ] },
  ];
  var CATS = [], CAT = {};
  GROUPS.forEach(function (g) {
    g.subs.forEach(function (s) {
      s[1].forEach(function (leaf) {
        var c = { id: leaf[0], label: leaf[1], stmt: g.stmt, side: g.side || null, group: g.label, sub: s[0], entry: s[2], child: s[3] || null };
        CATS.push(c); CAT[c.id] = c;
      });
    });
  });

  // Standardmappingen pr. kontonummer (Crediwires automatiske forslag ud fra nummer og navn)
  var DEFAULT_MAP = {
    1010: 'oms_dk_m', 1020: 'oms_eu_u', 1030: 'oms_w_u', 1040: 'oms_dk_m', 1050: 'oms_leje_m', 1090: 'oms_iga_m',
    1310: 'vf_dk_m', 1320: 'vf_eu', 1330: 'vf_w', 1340: 'vf_sub', 1350: 'vf_freight', 1360: 'vf_freight', 1380: 'vf_inv',
    2210: 'p_salary', 2220: 'p_holiday', 2230: 'p_pension', 2240: 'p_social', 2250: 'p_social', 2270: 'p_other', 2280: 'p_other', 2290: 'p_refund',
    2710: 'f_rent', 2720: 'f_util', 2730: 'f_maint', 2810: 'f_ads', 2820: 'f_fairs', 2830: 'f_travel', 2840: 'f_repr',
    3010: 'f_office', 3020: 'f_it', 3030: 'f_phone', 3040: 'f_audit', 3050: 'f_legal', 3060: 'f_ins', 3070: 'f_small', 3080: 'f_fees',
    3210: 'f_car', 3220: 'f_carlease', 3230: 'f_car', 3410: 'od_inc', 3420: 'od_exp',
    3610: 'd_immat', 3620: 'd_build', 3630: 'd_mach', 3640: 'd_equip', 3650: 'd_gain',
    3810: 'fi_int', 3820: 'fe_bank', 3830: 'fe_mort', 3840: 'fe_lease', 3850: 'fe_owner', 3860: 'fe_fx', 3870: 'fe_fees',
    3910: 'tax_year', 3920: 'tax_def',
    5110: 'a_dev', 5115: 'a_soft', 5120: 'a_build', 5130: 'a_mach', 5140: 'a_equip', 5150: 'a_dep',
    5210: 'inv_raw', 5220: 'inv_wip', 5230: 'inv_fin', 5300: 'r_trade', 5310: 'r_other', 5320: 'r_prep', 5400: 'l_bank', 5410: 'l_cash',
    6110: 'e_cap', 6120: 'e_ret', 6150: 'h_def',
    6210: 'lg_mort', 6220: 'lg_bank', 6230: 'lg_lease', 6240: 'lg_owner',
    6310: 'kg_bank', 6320: 'kg_cur', 6330: 'kg_trade', 6340: 'kg_prepay', 6350: 'kg_payroll', 6360: 'kg_holiday', 6370: 'kg_vat', 6380: 'kg_tax', 6390: 'kg_other',
  };
  // Konti, som Crediwire ikke kunne mappe sikkert, og som rådgiveren tilpassede ved sagens start
  var DEFAULT_MANUAL = { 1090: true, 3850: true, 6240: true };
  var DEFAULT_BY = 'Mette Larsen', DEFAULT_AT = '2026-09-15T10:12:00';

  var state = { status: 'idle', accounts: [], months: [], error: null, at: null };

  function emit() {
    try { window.dispatchEvent(new CustomEvent(EVENT)); } catch (e) {}
    if (window.CW && CW.bump) CW.bump();
  }

  // Læser arket: rækken med "Kontonr" er overskriften; månedskolonner hedder "Jan 2026" osv.
  function parse(buf) {
    var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    var ws = wb.Sheets.Saldobalance || wb.Sheets[wb.SheetNames[0]];
    var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    var low = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
    var hi = aoa.findIndex(function (r) { return r && low(r[0]) === 'kontonr'; });
    if (hi < 0) throw new Error('Kunne ikke finde rækken med kolonnenavne (Kontonr).');
    var head = aoa[hi], col = {}, months = [];
    head.forEach(function (h, c) {
      var k = low(h);
      if (k === 'kontonr') col.nr = c;
      else if (k === 'kontonavn') col.name = c;
      else if (k === 'kontotype') col.type = c;
      else if (k === 'sum fra') col.from = c;
      else if (k === 'sum til') col.to = c;
      else if (k.indexOf('primo') === 0) col.primo = c;
      else {
        var m = /^([a-zæøå]{3})\s+(\d{4})$/.exec(k);
        var mi = m ? MONTH_NAMES.map(low).indexOf(m[1]) : -1;
        if (mi >= 0) months.push({ c: c, key: m[2] + '-' + String(mi + 1).padStart(2, '0'), label: MONTH_NAMES[mi] + ' ' + m[2] });
      }
    });
    if (col.nr == null || col.name == null || col.type == null || !months.length) throw new Error('Arket mangler kolonner (Kontonr, Kontonavn, Kontotype og måneder).');
    months.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    var missing = NEEDED.filter(function (k) { return !months.some(function (m) { return m.key === k; }); });
    if (missing.length) throw new Error('Arket mangler måneder: ' + missing.join(', '));
    if (col.primo == null) throw new Error('Arket mangler kolonnen med primosaldo.');
    var num = function (v) { return typeof v === 'number' && isFinite(v) ? v : 0; };
    var accounts = [];
    for (var i = hi + 1; i < aoa.length; i++) {
      var r = aoa[i];
      if (!r) continue;
      var nr = Number(r[col.nr]);
      if (!nr || isNaN(nr)) continue;
      var type = String(r[col.type] || '').trim();
      var a = { nr: nr, name: String(r[col.name] || '').trim(), type: type };
      if (type === 'Sum') { a.from = Number(r[col.from]); a.to = Number(r[col.to]); }
      if (type === 'Drift' || type === 'Status') {
        a.primo = type === 'Status' && col.primo != null ? num(r[col.primo]) : 0;
        a.months = months.map(function (m) { return num(r[m.c]); });
      }
      accounts.push(a);
    }
    return { accounts: accounts, months: months.map(function (m) { return { key: m.key, label: m.label }; }) };
  }

  function load(force) {
    if (!force && (state.status === 'loading' || state.status === 'ready')) return;
    if (!window.XLSX || !window.fetch) { state.status = 'error'; state.error = 'Excel-biblioteket er ikke indlæst.'; emit(); return; }
    state.status = 'loading'; state.error = null;
    if (force) emit();
    fetch(FILE + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(function (buf) {
        var p = parse(buf);
        state.accounts = p.accounts; state.months = p.months; state.status = 'ready'; state.error = null; state.at = new Date().toISOString();
        emit();
      })
      .catch(function (e) {
        state.status = 'error'; state.error = (e && e.message) || String(e);
        try { console.warn('Saldobalancen kunne ikke hentes: ' + state.error); } catch (x) {}
        emit();
      });
  }

  // Den gemte mapping: { nr: { cat, method: 'auto'|'manual', by, at } } for alle drifts- og statuskonti
  function saved() {
    var over = {};
    try { over = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    var out = {};
    state.accounts.forEach(function (a) {
      if (a.type !== 'Drift' && a.type !== 'Status') return;
      var o = over[a.nr];
      if (o && (o.cat === null || CAT[o.cat])) { out[a.nr] = { cat: o.cat, method: 'manual', by: o.by, at: o.at }; return; }
      var d = DEFAULT_MAP[a.nr];
      out[a.nr] = d ? { cat: d, method: DEFAULT_MANUAL[a.nr] ? 'manual' : 'auto', by: DEFAULT_MANUAL[a.nr] ? DEFAULT_BY : null, at: DEFAULT_MANUAL[a.nr] ? DEFAULT_AT : null }
        : { cat: null, method: 'none' };
    });
    return out;
  }
  // Gemmer kategorierne i map (alle konti). Konti, der svarer til standarden, gemmes ikke.
  function save(map, by) {
    var over = {}, now = new Date().toISOString(), prev = {};
    try { prev = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    Object.keys(map).forEach(function (nr) {
      var cat = map[nr] && map[nr].cat !== undefined ? map[nr].cat : null;
      if ((DEFAULT_MAP[nr] || null) === cat) return;
      over[nr] = prev[nr] && prev[nr].cat === cat ? prev[nr] : { cat: cat, by: by, at: now };
    });
    try { if (Object.keys(over).length) localStorage.setItem(KEY, JSON.stringify(over)); else localStorage.removeItem(KEY); } catch (e) {}
    emit();
  }
  function resetToDefault() { try { localStorage.removeItem(KEY); } catch (e) {} emit(); }
  function hasOverrides() { try { return Object.keys(JSON.parse(localStorage.getItem(KEY) || '{}') || {}).length > 0; } catch (e) { return false; } }

  // Kontoens beløb i e-conomic-fortegn for en periode ({ months: [...] }):
  // driftskonti summen af månederne, statuskonti saldoen ultimo periodens sidste måned
  function accountValue(a, period) {
    if (!a.months) return 0;
    var idx = function (k) { for (var i = 0; i < state.months.length; i++) if (state.months[i].key === k) return i; return -1; };
    if (a.type === 'Drift') return period.months.reduce(function (s, k) { var i = idx(k); return s + (i >= 0 ? a.months[i] || 0 : 0); }, 0);
    var end = period.months[period.months.length - 1], v = a.primo || 0;
    for (var m = 0; m < state.months.length && state.months[m].key <= end; m++) v += a.months[m] || 0;
    return v;
  }
  // Sumkonti: drifts- og statuskonti i intervallet
  function sumValue(a, period) {
    return state.accounts.reduce(function (s, x) {
      return (x.type === 'Drift' || x.type === 'Status') && x.nr >= a.from && x.nr <= a.to ? s + accountValue(x, period) : s;
    }, 0);
  }
  function tableSign(cat) { return cat.stmt === 'pl' || cat.side === 'P' ? -1 : 1; }
  var r6 = function (v) { return Math.round(v * 1e6) / 1e6; };

  /* Tallene til regnskabstabellen (DKK mio., tabellens fortegn) for hver
     realiseret periode: entry[række], child['række / detalje'] og
     result (periodens resultat før udbytte). unmapped = drifts- og statuskonti
     uden kategori, der har beløb.
     Regnskab v5: periods (valgfri) er andre perioder end kvartalerne, f.eks. én pr. måned
     ({ key, label, months: ['2026-01'] }). Uden den regnes kvartalerne som før. */
  function compute(map, periods) {
    map = map || saved();
    periods = (periods || PERIODS).map(function (p) {
      var entry = {}, child = {};
      state.accounts.forEach(function (a) {
        var m = map[a.nr], cat = m && m.cat ? CAT[m.cat] : null;
        if (!cat) return;
        var v = accountValue(a, p) * tableSign(cat) / 1e6;
        entry[cat.entry] = (entry[cat.entry] || 0) + v;
        if (cat.child) { var k = cat.entry + ' / ' + cat.child; child[k] = (child[k] || 0) + v; }
      });
      Object.keys(entry).forEach(function (k) { entry[k] = r6(entry[k]); });
      Object.keys(child).forEach(function (k) { child[k] = r6(child[k]); });
      return { key: p.key, label: p.label, entry: entry, child: child };
    });
    var unmapped = state.accounts.filter(function (a) {
      return (a.type === 'Drift' || a.type === 'Status') && !(map[a.nr] && map[a.nr].cat) && (a.primo || a.months.some(function (v) { return v; }));
    });
    return { periods: periods, unmapped: unmapped };
  }

  // Gemmes mappingen i en anden fane, regnes tabellen om her også
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) emit(); });

  window.CW_MAP = {
    FILE: FILE, FILE_NAME: FILE_NAME, EVENT: EVENT, PERIODS: PERIODS, GROUPS: GROUPS, CATS: CATS, CAT: CAT,
    status: function () { return state.status; }, error: function () { return state.error; },
    span: function () { var m = state.months; return m.length ? { key: 'all', label: m[0].label + ' - ' + m[m.length - 1].label, months: m.map(function (x) { return x.key; }) } : null; },
    ready: function () { return state.status === 'ready'; },
    accounts: function () { return state.accounts; }, months: function () { return state.months; },
    load: load, saved: saved, save: save, resetToDefault: resetToDefault, hasOverrides: hasOverrides,
    accountValue: accountValue, sumValue: sumValue, compute: compute, isDefault: function (nr, cat) { return (DEFAULT_MAP[nr] || null) === cat; },
    defaultCat: function (nr) { return DEFAULT_MAP[nr] || null; },
  };
  load();
})();

// Modul-eksport til Vue-komponenterne
export const CW_MAP = window.CW_MAP;
