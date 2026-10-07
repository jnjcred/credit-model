/* ───────────────────────────────────────────────────────────────────────────
   Prompt-værksted (ruten 'prompts', venstremenuen): produktteamets egen side til
   at rette promptene i prompts/*.md, som "Kør AI igen" bruger under Virksomheden
   → Produkt, marked og branche (financials.jsx: finAiPrompt/finAiGenerate).

   Gem: kører prototypen lokalt (devserver.js), skrives filen direkte i prompts/,
   og den forrige version lægges i prompts/.historik/. På et hosted domæne kan
   filen ikke skrives; så gemmes promptet i denne browser (localStorage
   cw_prompt_override:<fil>, ikke kabul:, så Nulstil demo ikke sletter det), og
   "Kør AI igen" bruger browserens kopi. Filen kan altid hentes som .md.
   "Prøv på Nordhavn" kører kladden med det samme uden at gemme noget og viser
   den prompt, der blev sendt.
   window.CW_PROMPTS: load/parse/build/save, som financials.jsx også bruger.
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

/* ── Siden ─────────────────────────────────────────────────────────────────── */

function pwWords(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

function PromptWorkshopPage({ go }) {
  const P = window.CW_PROMPTS;
  const [fileKey, setFileKey] = React.useState(() => { try { return localStorage.getItem('cw_pw_file') || PW_FILES[1].file; } catch (e) { return PW_FILES[1].file; } });
  const meta = PW_FILES.find(f => f.file === fileKey) || PW_FILES[0];
  const [writable, setWritable] = React.useState(null);           // null = ukendt
  const [fileRaw, setFileRaw] = React.useState(null);             // filens indhold
  const [base, setBase] = React.useState(null);                   // { web, system, task } som gemt (fil eller browser)
  const [draft, setDraft] = React.useState(null);
  const [loadErr, setLoadErr] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [, bump] = React.useReducer(x => x + 1, 0);
  const sysRef = React.useRef(null), taskRef = React.useRef(null), lastFocus = React.useRef('task');

  React.useEffect(() => { P.writable().then(setWritable); }, []);
  React.useEffect(() => {
    const on = () => bump();
    window.addEventListener('cw-ai-config-changed', on);
    return () => window.removeEventListener('cw-ai-config-changed', on);
  }, []);

  // Hent filen (og evt. browserens kopi), når der skiftes prompt
  React.useEffect(() => {
    let dead = false;
    setLoadErr(null); setDraft(null); setBase(null); setSavedAt(null);
    try { localStorage.setItem('cw_pw_file', fileKey); } catch (e) {}
    P.fetchFile(fileKey).then(raw => {
      if (dead) return;
      setFileRaw(raw);
      const o = P.override(fileKey);
      const f = pwFields(o ? o.content : raw);
      setBase(f); setDraft(f);
    }).catch(err => { if (!dead) setLoadErr(err.message || String(err)); });
    P.history(fileKey).then(h => { if (!dead) setHistory(h); });
    return () => { dead = true; };
  }, [fileKey]);

  const override = P.override(fileKey);
  const dirty = !!(draft && base && (draft.web !== base.web || draft.system !== base.system || draft.task !== base.task));

  const switchFile = (f) => {
    if (f === fileKey) return;
    if (!dirty) { setFileKey(f); return; }
    CW.confirm({ title: t('Kassér ændringerne?'), text: t('Du har ændringer i promptet, som ikke er gemt.'), confirmLabel: t('Kassér og skift') })
      .then(r => { if (r.ok) setFileKey(f); });
  };
  const insertPh = (k) => {
    const ref = lastFocus.current === 'system' ? sysRef : taskRef;
    const el = ref.current;
    const field = lastFocus.current === 'system' ? 'system' : 'task';
    const val = draft[field];
    const at = el && typeof el.selectionStart === 'number' ? el.selectionStart : val.length;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : at;
    const ins = '{' + k + '}';
    setDraft(Object.assign({}, draft, { [field]: val.slice(0, at) + ins + val.slice(end) }));
    setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(at + ins.length, at + ins.length); } }, 0);
  };
  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    const content = pwBuild(fileRaw || '', draft);
    try {
      if (writable) {
        const at = await P.saveFile(fileKey, content);
        P.clearOverride(fileKey);
        setFileRaw(content); setSavedAt(at);
        CW.toast(pwFill(t('Gemt i prompts/{fil}'), { fil: fileKey }));
        P.history(fileKey).then(setHistory);
      } else {
        P.setOverride(fileKey, content);
        setSavedAt(new Date().toISOString());
        CW.toast(t('Gemt i denne browser. Filen i prompts/ er ikke ændret.'));
      }
      setBase(draft);
    } catch (err) {
      CW.toast(t('Kunne ikke gemme') + ': ' + (err.message || err), { tone: 'danger' });
    } finally { setSaving(false); }
  };
  const revert = () => { setDraft(base); };
  const dropOverride = () => {
    CW.confirm({ title: t('Slet browserens kopi?'), text: t('"Kør AI igen" bruger derefter filen i prompts/ igen.'), confirmLabel: t('Slet kopien') })
      .then(r => { if (!r.ok) return; P.clearOverride(fileKey); const f = pwFields(fileRaw || ''); setBase(f); setDraft(f); bump(); });
  };
  const download = () => {
    const content = pwBuild(fileRaw || '', draft);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileKey;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const status = !base ? '' : dirty ? t('Ændringer er ikke gemt')
    : override ? pwFill(t('Gemt i denne browser {date}. Filen i prompts/ er ikke ændret.'), { date: CW.fmtWhen(override.at) })
    : savedAt ? pwFill(t('Gemt i filen {date}'), { date: CW.fmtWhen(savedAt) })
    : t('Som i filen');

  const taStyle = { width: '100%', height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.55, fontFamily: 'var(--mono, ui-monospace, monospace)', fontSize: 12.5, boxSizing: 'border-box', background: '#fff' };

  return (
    <div className="page page-wide" style={{ maxWidth: 1200, padding: '24px 32px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 className="page-title">{t('Prompt-værksted')}</h1>
          <div className="page-sub" style={{ maxWidth: 760 }}>{t('Promptene bag "Kør AI igen" under Virksomheden → Produkt, marked og branche. Ret, prøv på Nordhavn, og gem.')}</div>
        </div>
        <PwAiStatus/>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '240px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* Promptene */}
        <nav className="card" aria-label={t('Prompts')} style={{ padding: '6px 6px' }}>
          {PW_FILES.map(f => {
            const on = f.file === fileKey;
            const o = P.override(f.file);
            return (
              <button key={f.file} type="button" aria-current={on ? 'page' : undefined} onClick={() => switchFile(f.file)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', border: 0, borderRadius: 8, cursor: 'pointer', font: 'inherit', background: on ? 'var(--c-surface-2)' : 'transparent' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: on ? 600 : 500, color: 'var(--c-ink)' }}>
                  {t(f.label)}
                  {on && dirty && <span title={t('Ændringer er ikke gemt')} aria-label={t('Ændringer er ikke gemt')} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-warn)' }}/>}
                </span>
                <span className="mono" style={{ display: 'block', fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 1 }}>prompts/{f.file}{o ? ' · ' + t('browserkopi') : ''}</span>
              </button>
            );
          })}
          <div style={{ fontSize: 12, color: 'var(--c-text-3)', padding: '10px 10px 6px', lineHeight: 1.5, borderTop: '1px solid var(--c-line-2)', marginTop: 6 }}>
            {writable === false ? t('Prototypen kører ikke lokalt, så ændringer gemmes i denne browser. Hent filen for at lægge den i prompts/.') : t('Ændringer gemmes direkte i prompts/, og den forrige version lægges i prompts/.historik/.')}
          </div>
        </nav>

        {/* Editoren */}
        <section className="card" aria-labelledby="pw-title" style={{ padding: '16px 20px 18px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 id="pw-title" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>{t(meta.label)}</h2>
              <div style={{ fontSize: 12.5, color: dirty ? 'var(--c-warn-ink, var(--c-ink))' : 'var(--c-text-3)', marginTop: 2 }} aria-live="polite">{status}</div>
            </div>
            {override && !dirty && <button type="button" className="btn-ghost-sm" onClick={dropOverride}>{t('Slet browserens kopi')}</button>}
          </div>

          {loadErr && <div role="alert" style={{ marginTop: 12, fontSize: 13, color: 'var(--c-danger)' }}>{pwFill(t('Kunne ikke hente prompts/{fil}: {fejl}'), { fil: fileKey, fejl: loadErr })}</div>}
          {!draft && !loadErr && <div style={{ marginTop: 16, fontSize: 13, color: 'var(--c-text-3)' }}>{t('Henter …')}</div>}

          {draft && <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, color: 'var(--c-ink)', cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.web} onChange={e => setDraft(Object.assign({}, draft, { web: e.target.checked }))}/>
              {t('Må søge på nettet')}
              <span style={{ color: 'var(--c-text-3)', fontSize: 12.5 }}>{t('(kun Claude Code og Claude via API-nøgle kan søge; en kørsel tager så 1-4 minutter)')}</span>
            </label>

            <div style={{ marginTop: 16 }}>
              <label htmlFor="pw-system" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{t('System')}</label>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', margin: '2px 0 6px' }}>{t('Rollen og de faste regler. Skriv hvorfor frem for at gentage forbud.')}</div>
              <textarea id="pw-system" ref={sysRef} rows={7} value={draft.system} onFocus={() => { lastFocus.current = 'system'; }} onClick={() => { lastFocus.current = 'system'; }} onKeyUp={() => { lastFocus.current = 'system'; }}
                onChange={e => setDraft(Object.assign({}, draft, { system: e.target.value }))} className="input" style={taStyle}/>
            </div>
            <div style={{ marginTop: 14 }}>
              <label htmlFor="pw-task" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Opgave')}</label>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', margin: '2px 0 6px' }}>{t('Sagens oplysninger og selve opgaven. Pladsholderne nedenfor udfyldes, før prompten sendes.')}</div>
              <textarea id="pw-task" ref={taskRef} rows={18} value={draft.task} onFocus={() => { lastFocus.current = 'task'; }} onClick={() => { lastFocus.current = 'task'; }} onKeyUp={() => { lastFocus.current = 'task'; }}
                onChange={e => setDraft(Object.assign({}, draft, { task: e.target.value }))} className="input" style={taStyle}/>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginBottom: 6 }}>{t('Pladsholdere (klik for at sætte ind, hvor markøren står):')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PW_PLACEHOLDERS.map(p => (
                  <button key={p.k} type="button" onClick={() => insertPh(p.k)} title={t(p.d)} aria-label={pwFill(t('Indsæt {navn}: {beskrivelse}'), { navn: '{' + p.k + '}', beskrivelse: t(p.d) })}
                    className="mono" style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-ink)', cursor: 'pointer' }}>
                    {'{' + p.k + '}'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--c-line-2)' }}>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving} aria-busy={saving || undefined}>{saving ? t('Gemmer …') : t('Gem')}</button>
              <button type="button" className="btn" onClick={revert} disabled={!dirty}>{t('Fortryd ændringer')}</button>
              <div style={{ flex: 1 }}/>
              <button type="button" className="btn-ghost-sm" onClick={download}><I.Download size={13} aria-hidden="true"/> {t('Hent som fil')}</button>
            </div>

            <PwTryPanel meta={meta} draft={draft}/>

            {writable && history.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <CWFold id="pw-history" label={t('Tidligere versioner')} count={history.length}>
                  {history.map(v => (
                    <div key={v.name} className="cw-row" style={{ alignItems: 'center' }}>
                      <span style={{ color: 'var(--c-text-2)', fontSize: 13 }}>{CW.fmtWhen(v.at)}</span>
                      <button type="button" className="btn-ghost-sm" onClick={() => { setDraft(pwFields(v.content)); CW.toast(t('Versionen er indlæst. Gem for at bruge den.')); }}>{t('Indlæs')}</button>
                    </div>
                  ))}
                </CWFold>
              </div>
            )}
          </>}
        </section>
      </div>
    </div>
  );
}

// Hvilken AI er forbundet, og kan den søge? Skift åbner memoets AI-indstillinger.
function PwAiStatus() {
  const [open, setOpen] = React.useState(false);
  const [, bump] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const on = () => bump();
    window.addEventListener('cw-ai-config-changed', on);
    return () => window.removeEventListener('cw-ai-config-changed', on);
  }, []);
  const A = window.AI;
  const ready = !!(A && A.isReady && A.isReady());
  const cfg = A && A.getConfig ? A.getConfig() : null;
  const prov = ready && A.provider ? A.provider() : null;
  const engine = cfg && cfg.provider === 'local' ? ((cfg.models && cfg.models.local) === 'codex' ? 'Codex CLI' : 'Claude Code') : null;
  const search = ready && A.canSearch && A.canSearch();
  const Dialog = window.MemoAI && window.MemoAI.AiSettingsDialog;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--c-text-2)' }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: ready ? 'var(--c-success)' : 'var(--c-text-4)' }}/>
      <span>{ready ? (prov ? prov.label : 'AI') + (engine ? ' (' + engine + ')' : '') + ' · ' + (search ? t('kan søge på nettet') : t('søger ikke på nettet')) : t('Ingen AI forbundet')}</span>
      {Dialog && <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>{ready ? t('Skift AI') : t('Forbind AI')}</button>}
      {Dialog && <Dialog open={open} onClose={() => { setOpen(false); bump(); }}/>}
    </div>
  );
}

// Prøv kladden på Nordhavn uden at gemme noget
function PwTryPanel({ meta, draft }) {
  const [target, setTarget] = React.useState(meta.ids[0]);
  React.useEffect(() => { setTarget(meta.ids[0]); setResult(null); setErr(null); }, [meta.file]);
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [result, setResult] = React.useState(null);
  const [live, setLive] = React.useState('');
  const [err, setErr] = React.useState(null);
  const ctrl = React.useRef(null);
  const ready = !!(window.AI && AI.isReady && AI.isReady());
  React.useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);
  const run = async () => {
    if (running || !ready) return;
    setRunning(true); setErr(null); setResult(null); setLive(''); setElapsed(0);
    ctrl.current = new AbortController();
    try {
      const r = await finAiGenerate(target, { system: draft.system, task: draft.task, web: draft.web }, {
        signal: ctrl.current.signal,
        onDelta: (d, all) => { if (typeof all === 'string') setLive(all); },
      });
      setResult(r);
    } catch (e) {
      if (!(e && e.code === 'abort')) setErr(e.message || String(e));
    } finally { setRunning(false); ctrl.current = null; }
  };
  const stop = () => { if (ctrl.current) ctrl.current.abort(); };
  const use = () => {
    if (!result) return;
    finAiPatch(target, { ai: result.text, aiAt: new Date().toISOString(), aiWeb: result.web, edited: null, editedAt: null, editedBy: null });
    CW.toast(t('Teksten står nu som AI-udkast under Virksomheden'));
  };
  const label = (id) => { const d = FIN_AI_DEFS[id]; return d ? t(d.label) : id; };
  const words = result ? pwWords(result.text) : 0;
  const lines = result ? Math.max(1, Math.ceil(result.text.length / 110)) : 0;
  return (
    <section aria-labelledby="pw-try-h" style={{ marginTop: 18, padding: '14px 16px', borderRadius: 10, background: 'var(--c-surface-2)', border: '1px solid var(--c-line-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 id="pw-try-h" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', flex: 1 }}>{t('Prøv på Nordhavn')}</h3>
        {meta.ids.length > 1 && (
          <select className="input" aria-label={t('Hvilket punkt')} value={target} onChange={e => setTarget(e.target.value)} style={{ height: 30, fontSize: 13, width: 'auto' }}>
            {meta.ids.map(id => <option key={id} value={id}>{label(id)}</option>)}
          </select>
        )}
        {running
          ? <button type="button" className="btn btn-sm" onClick={stop}>{t('Stop')}</button>
          : <button type="button" className="btn btn-sm" onClick={run} disabled={!ready} title={ready ? undefined : t('Forbind en AI øverst på siden for at prøve promptet')}><I.Refresh size={12} aria-hidden="true"/> {t('Kør kladden')}</button>}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 4 }}>
        {ready ? t('Kører det, der står i felterne nu, også selv om det ikke er gemt. Intet ændres i sagen, før du vælger at bruge teksten.') : t('Forbind en AI øverst på siden for at prøve promptet.')}
      </div>
      <div aria-live="polite">
        {running && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--c-text-2)' }}>{(draft.web && AI.canSearch && AI.canSearch() ? t('AI søger på nettet og skriver …') : t('AI skriver …')) + ' ' + elapsed + ' s'}</div>}
        {running && live && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6, opacity: 0.7 }}>{live}</div>}
        {err && <div role="alert" style={{ marginTop: 10, fontSize: 13, color: 'var(--c-danger)' }}>{err}</div>}
        {result && (
          <div style={{ marginTop: 10 }}>
            <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--c-text)', lineHeight: 1.65, maxWidth: 760 }}>{result.text}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5, color: 'var(--c-text-3)' }}>
              <span>{pwFill(t('{ord} ord · ca. {linjer} linjer i boksen · {sek} s · {web}'), { ord: words, linjer: lines, sek: elapsed, web: result.web ? t('med websøgning') : t('uden websøgning') })}</span>
              <div style={{ flex: 1 }}/>
              <button type="button" className="btn btn-sm" onClick={use}>{pwFill(t('Brug som AI-udkast for {navn}'), { navn: label(target) })}</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <CWFold id="pw-sent" label={t('Prompten, der blev sendt')}>
                <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginBottom: 4 }}>{t('System')}</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, lineHeight: 1.5, background: '#fff', border: '1px solid var(--c-line-2)', borderRadius: 6, padding: 10, maxHeight: 220, overflow: 'auto', margin: '0 0 10px' }}>{result.system}</pre>
                <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginBottom: 4 }}>{t('Opgave')}</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, lineHeight: 1.5, background: '#fff', border: '1px solid var(--c-line-2)', borderRadius: 6, padding: 10, maxHeight: 320, overflow: 'auto', margin: 0 }}>{result.task}</pre>
              </CWFold>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

window.PromptWorkshopPage = PromptWorkshopPage;
