/* ───────────────────────────────────────────────────────────────────────────
   Prompt-værksted: promptfilerne i prompts/*.md og tjenesten window.CW_PROMPTS
   (flyttet uændret fra prompt_workshop.jsx ved migrationen til Vue; skærmen er
   src/views/prompts/PromptWorkshopView.vue).

   Promptene bruges af "Kør AI igen" under Virksomheden → Produkt, marked og
   branche (financials: finAiPrompt/finAiGenerate). Gem: kører prototypen lokalt
   (devserver.js), skrives filen direkte i prompts/, og den forrige version lægges
   i prompts/.historik/. På et hosted domæne kan filen ikke skrives; så gemmes
   promptet i denne browser (localStorage cw_prompt_override:<fil>, ikke kabul:,
   så Nulstil demo ikke sletter det), og "Kør AI igen" bruger browserens kopi.
   window.CW_PROMPTS: load/parse/build/save, som Regnskab (financials) også bruger.
   ─────────────────────────────────────────────────────────────────────────── */

const PW_FILES = [
  { file: 'produktbeskrivelse.md', label: 'Produktbeskrivelse', ids: ['product'] },
  { file: 'markedet.md', label: 'Markedet', ids: ['market'] },
  { file: 'pest.md', label: 'PEST-analyse', ids: ['pest:Politisk', 'pest:Økonomisk', 'pest:Socialt', 'pest:Teknologisk'] },
];
const PW_OVERRIDE = 'cw_prompt_override:';
const PW_PLACEHOLDERS = [
  { k: 'virksomhed', d: 'Virksomhedens navn' },
  { k: 'cvr', d: 'CVR-nummer' },
  { k: 'branche', d: 'Branche fra CVR (eller rådgiverens rettelse)' },
  { k: 'aktivitet', d: 'Kort aktivitetsbeskrivelse' },
  { k: 'hjemsted', d: 'Hjemsted' },
  { k: 'ansatte', d: 'Antal ansatte' },
  { k: 'hjemmeside', d: 'Virksomhedens hjemmeside' },
  { k: 'dato', d: 'Dagens dato' },
  { k: 'sprog', d: 'dansk eller engelsk (appens sprog)' },
  { k: 'materiale', d: 'Ledelsesberetningen i nyeste årsrapport og markedsrapporten' },
  { k: 'nuvaerende_tekst', d: 'Teksten i boksen nu (seneste AI-udkast)' },
  { k: 'faktor', d: 'Kun PEST: Politisk, Økonomisk, Socialt eller Teknologisk' },
];

function pwFill(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); }

/* ── Fil: læs, del op og byg igen ──────────────────────────────────────────── */
// { head, sections: [{ title, body }] }: alt over første "## " er head
function pwParse(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const i = text.search(/^##\s+/m);
  const head = i < 0 ? text : text.slice(0, i);
  const sections = i < 0 ? [] : text.slice(i).split(/^##\s+/m).slice(1).map(chunk => {
    const nl = chunk.indexOf('\n');
    return { title: (nl < 0 ? chunk : chunk.slice(0, nl)).trim(), body: nl < 0 ? '' : chunk.slice(nl + 1).replace(/^\n+|\s+$/g, '') };
  });
  return { head: head.replace(/\s+$/, ''), sections };
}
function pwSection(doc, title) { return doc.sections.find(s => s.title.toLowerCase() === title.toLowerCase()); }
function pwFields(raw) {
  const doc = pwParse(raw);
  const ind = pwSection(doc, 'Indstillinger');
  return {
    web: /websøgning:\s*ja/i.test(ind ? ind.body : ''),
    system: (pwSection(doc, 'System') || {}).body || '',
    task: (pwSection(doc, 'Opgave') || {}).body || '',
  };
}
// Byg filen igen af den oprindelige (bevarer titel, forklaring og ukendte afsnit)
function pwBuild(raw, f) {
  const doc = pwParse(raw);
  const put = (title, body) => {
    const s = pwSection(doc, title);
    if (s) s.body = body; else doc.sections.push({ title, body });
  };
  const ind = pwSection(doc, 'Indstillinger');
  const indBody = ind ? (/websøgning:/i.test(ind.body) ? ind.body.replace(/websøgning:\s*\w+/i, 'websøgning: ' + (f.web ? 'ja' : 'nej')) : ind.body + '\n- websøgning: ' + (f.web ? 'ja' : 'nej')) : '- websøgning: ' + (f.web ? 'ja' : 'nej');
  put('Indstillinger', indBody.trim());
  put('System', f.system.trim());
  put('Opgave', f.task.trim());
  return (doc.head ? doc.head + '\n\n' : '') + doc.sections.map(s => '## ' + s.title + '\n\n' + s.body.trim()).join('\n\n') + '\n';
}

window.CW_PROMPTS = {
  override(file) {
    try { const v = JSON.parse(localStorage.getItem(PW_OVERRIDE + file) || 'null'); return v && typeof v.content === 'string' ? v : null; } catch (e) { return null; }
  },
  setOverride(file, content) { try { localStorage.setItem(PW_OVERRIDE + file, JSON.stringify({ content, at: new Date().toISOString() })); } catch (e) {} },
  clearOverride(file) { try { localStorage.removeItem(PW_OVERRIDE + file); } catch (e) {} },
  async fetchFile(file) {
    const r = await fetch('prompts/' + file + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  },
  // Det, "Kør AI igen" bruger: browserens kopi, hvis der er en, ellers filen
  async load(file) { const o = this.override(file); return o ? o.content : this.fetchFile(file); },
  // Kan filerne skrives (devserver.js lokalt)?
  async writable() {
    try { const r = await fetch('/local-prompts/status', { cache: 'no-store' }); if (!r.ok) return false; const j = await r.json(); return !!(j && j.writable); } catch (e) { return false; }
  },
  async saveFile(file, content) {
    const r = await fetch('/local-prompts/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file, content }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
    return j.savedAt;
  },
  async history(file) {
    try { const r = await fetch('/local-prompts/history?file=' + encodeURIComponent(file), { cache: 'no-store' }); if (!r.ok) return []; const j = await r.json(); return j.versions || []; } catch (e) { return []; }
  },
  parse: pwParse, fields: pwFields, build: pwBuild,
};

// Antal ord i et svar (Prøv på Nordhavn)
function pwWords(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

// Modul-eksport til Vue-komponenterne. window.CW_PROMPTS sættes ovenfor ved indlæsning
// (src/bootstrap.js), så financials kan læse promptene, uanset hvilken skærm der vises.
const CW_PROMPTS = window.CW_PROMPTS;
export {
  PW_FILES, PW_OVERRIDE, PW_PLACEHOLDERS, CW_PROMPTS,
  pwFill, pwParse, pwSection, pwFields, pwBuild, pwWords,
};
