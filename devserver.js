#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   Dev-server til prototypen.

   To ting i én:
   1. Serverer prototypens filer på http://localhost:8080
   2. Stiller en lokal AI-bro til rådighed under /local-ai, så prototypen kan
      skrive credit memo'et via Claude Code eller Codex i stedet for via API.

   Hvorfor broen findes
   --------------------
   Et Claude- eller ChatGPT-abonnement giver ikke adgang til API'et. API'et
   betales særskilt pr. token. Men begge leverandører udgiver en kommandolinje
   (Claude Code og Codex CLI), der logger ind med selve abonnementet. Kører de
   lokalt på rådgiverens egen maskine, koster kaldene ikke ekstra ud over det
   abonnement der allerede er betalt for.

   Broen spawner altså den lokale kommandolinje, sender prompten på stdin og
   streamer svaret tilbage til browseren som SSE, i samme format som prototypen
   allerede bruger til API-kald.

   Det her er en udviklingsopstilling, ikke en produktionsarkitektur. Den virker
   kun på en maskine hvor kommandolinjen er installeret og logget ind, og
   leverandørernes forbrugslofter for abonnementet gælder stadig.
   ──────────────────────────────────────────────────────────────────────────── */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);

/* ── Find de lokale kommandolinjer ────────────────────────────────────────── */

function findClaude() {
  // 1. Sat eksplicit
  if (process.env.CW_CLAUDE_BIN && fs.existsSync(process.env.CW_CLAUDE_BIN)) {
    return process.env.CW_CLAUDE_BIN;
  }
  // 2. VS Code-udvidelsen har en indbygget binær. Tag den nyeste version.
  const extDir = path.join(os.homedir(), '.vscode', 'extensions');
  try {
    const cands = fs.readdirSync(extDir)
      .filter(n => n.startsWith('anthropic.claude-code-'))
      .sort()
      .reverse()
      .map(n => path.join(extDir, n, 'resources', 'native-binary', 'claude.exe'))
      .filter(p => fs.existsSync(p));
    if (cands.length) return cands[0];
  } catch (e) { /* ingen udvidelsesmappe */ }
  // 3. På PATH
  for (const name of ['claude.cmd', 'claude.exe', 'claude']) {
    const p = onPath(name);
    if (p) return p;
  }
  return null;
}

/* Codex installeres som en .cmd-wrapper på Windows, og Node nægter siden 18.20 at
   spawne .cmd uden shell. Vi finder derfor selve JS-entrypointet og kører det med
   den node der allerede kører, så vi slipper for at gå gennem en shell. */
function findCodex() {
  if (process.env.CW_CODEX_BIN && fs.existsSync(process.env.CW_CODEX_BIN)) {
    return { cmd: process.env.CW_CODEX_BIN, pre: [] };
  }
  const roots = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.mjs'),
  ];
  for (const p of roots) {
    if (fs.existsSync(p)) return { cmd: process.execPath, pre: [p] };
  }
  // Fald tilbage til en rigtig binær hvis der findes en
  for (const name of ['codex.exe', 'codex']) {
    const p = onPath(name);
    if (p && !p.endsWith('.cmd') && !p.endsWith('.ps1')) return { cmd: p, pre: [] };
  }
  return null;
}

function onPath(name) {
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const d of dirs) {
    if (!d) continue;
    const p = path.join(d, name);
    try { if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; } catch (e) {}
  }
  return null;
}

const CLAUDE_BIN = findClaude();
const CODEX_BIN = findCodex();

/* Kommandolinjerne loader projektets egne indstillinger, hooks og CLAUDE.md fra
   arbejdsmappen. Det er unødigt her og gør kaldet langsommere, så de køres i en
   tom midlertidig mappe. */
const NEUTRAL_CWD = path.join(os.tmpdir(), 'cw-local-ai');
try { fs.mkdirSync(NEUTRAL_CWD, { recursive: true }); } catch (e) {}

/* ── Status: hvad er tilgængeligt, og er der logget ind ───────────────────── */

let statusCache = null;
let statusCachedAt = 0;

function probe() {
  const now = Date.now();
  if (statusCache && now - statusCachedAt < 30000) return statusCache;

  const out = {
    claude: { available: false, detail: 'Claude Code er ikke installeret på denne maskine.' },
    codex: { available: false, detail: 'Codex CLI er ikke installeret på denne maskine.' },
  };

  if (CLAUDE_BIN) {
    const v = run(CLAUDE_BIN, ['--version']);
    out.claude = v.ok
      ? { available: true, detail: v.text }
      : { available: false, detail: 'Claude Code blev fundet, men svarer ikke: ' + v.text };
  }

  if (CODEX_BIN) {
    const v = run(CODEX_BIN.cmd, CODEX_BIN.pre.concat(['--version']));
    if (!v.ok) {
      out.codex = { available: false, detail: 'Codex CLI blev fundet, men svarer ikke: ' + v.text };
    } else {
      // Codex skriver login-status på stderr, så begge strømme skal læses
      const login = run(CODEX_BIN.cmd, CODEX_BIN.pre.concat(['login', 'status']));
      out.codex = /logged in/i.test(login.text)
        ? { available: true, detail: v.text + ' · ' + login.text.replace(/\s+/g, ' ') }
        : { available: false, detail: 'Codex CLI er installeret, men ikke logget ind. Kør "codex login" i en terminal.' };
    }
  }

  statusCache = out;
  statusCachedAt = now;
  return out;
}

/* Kører en kommando og samler stdout og stderr. Begge dele er nødvendige:
   Claude Code svarer på stdout, Codex skriver login-status på stderr. */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { timeout: 30000, encoding: 'utf8', cwd: NEUTRAL_CWD, windowsHide: true });
  const text = ((r.stdout || '') + '\n' + (r.stderr || '')).trim();
  if (r.error) return { ok: false, text: r.error.message };
  return { ok: r.status === 0, text: text.split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 200) };
}

/* ── Generering ───────────────────────────────────────────────────────────── */

function runClaude(system, prompt, onDelta, onDone, onError, signalRef) {
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--verbose',
    '--max-turns', '1',
    // Ingen værktøjer: det her er ren tekstgenerering, ikke en agentopgave.
    '--allowed-tools', '',
    // Ingen MCP-servere: de tager tid at starte og bruges ikke her
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
  ];
  if (system) args.push('--append-system-prompt', system);

  const child = spawn(CLAUDE_BIN, args, { cwd: NEUTRAL_CWD, windowsHide: true });
  signalRef.child = child;

  let buf = '';
  let text = '';
  let sawResult = false;

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev;
      try { ev = JSON.parse(line); } catch (e) { continue; }

      if (ev.type === 'stream_event' && ev.event && ev.event.type === 'content_block_delta') {
        const d = ev.event.delta;
        if (d && d.type === 'text_delta' && d.text) { text += d.text; onDelta(d.text); }
      } else if (ev.type === 'result') {
        sawResult = true;
        if (ev.is_error) {
          onError(ev.result || 'Claude Code returnerede en fejl.');
          return;
        }
        // Faldback hvis delta-strømmen svigtede
        if (!text && typeof ev.result === 'string') { text = ev.result; onDelta(text); }
      }
    }
  });

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', d => { stderr += d; });

  child.on('error', err => onError('Kunne ikke starte Claude Code: ' + err.message));

  child.on('close', code => {
    if (signalRef.aborted) return;
    if (!sawResult && code !== 0) {
      onError('Claude Code stoppede med kode ' + code + (stderr ? '. ' + stderr.trim().split('\n')[0] : ''));
      return;
    }
    onDone(text);
  });
}

function runCodex(system, prompt, onDelta, onDone, onError, signalRef) {
  // Codex streamer ikke tokens ud, kun færdige beskeder, så svaret kommer samlet.
  const args = CODEX_BIN.pre.concat(['exec', '--skip-git-repo-check', '--json', '--color', 'never', '-']);
  const child = spawn(CODEX_BIN.cmd, args, { cwd: NEUTRAL_CWD, windowsHide: true, shell: false });
  signalRef.child = child;

  let buf = '';
  let text = '';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line || line[0] !== '{') continue;
      let ev;
      try { ev = JSON.parse(line); } catch (e) { continue; }
      if (ev.type === 'item.completed' && ev.item && ev.item.type === 'agent_message' && ev.item.text) {
        text += ev.item.text;
        onDelta(ev.item.text);
      } else if (ev.type === 'error' || ev.type === 'turn.failed') {
        onError((ev.message || (ev.error && ev.error.message) || 'Codex returnerede en fejl.'));
      }
    }
  });

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', d => { stderr += d; });

  child.on('error', err => onError('Kunne ikke starte Codex: ' + err.message));

  child.on('close', code => {
    if (signalRef.aborted) return;
    if (!text && code !== 0) {
      onError('Codex stoppede med kode ' + code + (stderr ? '. ' + stderr.trim().split('\n').slice(-1)[0] : ''));
      return;
    }
    onDone(text);
  });

  // Systemprompt og opgave samles, da codex exec kun tager én prompt
  child.stdin.end((system ? system + '\n\n' : '') + prompt, 'utf8');
}

/* ── HTTP ─────────────────────────────────────────────────────────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => {
      b += c;
      if (b.length > 8e6) { reject(new Error('for stor forespørgsel')); req.destroy(); }
    });
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/local-ai/status') {
    const s = probe();
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(s));
    return;
  }

  if (pathname === '/local-ai/generate' && req.method === 'POST') {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'ugyldig forespørgsel' }));
      return;
    }

    const engine = payload.engine === 'codex' ? 'codex' : 'claude';
    const haveEngine = engine === 'codex' ? !!CODEX_BIN : !!CLAUDE_BIN;
    if (!haveEngine) {
      res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: (engine === 'codex' ? 'Codex CLI' : 'Claude Code') + ' er ikke installeret på denne maskine.' }));
      return;
    }

    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no',
    });

    const send = (obj) => { try { res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (e) {} };
    const signalRef = { aborted: false, child: null };

    req.on('close', () => {
      signalRef.aborted = true;
      if (signalRef.child && !signalRef.child.killed) {
        try { signalRef.child.kill(); } catch (e) {}
      }
    });

    // Hold forbindelsen i live mens kommandolinjen starter op
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 10000);
    const finish = () => { clearInterval(ping); try { res.end(); } catch (e) {} };

    const runner = engine === 'codex' ? runCodex : runClaude;
    runner(
      payload.system || '',
      payload.prompt || '',
      (delta) => send({ delta }),
      (text) => { send({ done: true, text }); finish(); },
      (message) => { send({ error: message }); finish(); },
      signalRef
    );

    if (engine === 'claude') {
      signalRef.child.stdin.end(payload.prompt || '', 'utf8');
    }
    return;
  }

  // Statiske filer
  let rel = pathname.replace(/^\/+/, '');
  if (!rel) rel = 'index.html';
  const full = path.join(ROOT, rel);
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end('nej'); return; }

  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('ikke fundet'); return; }
    res.writeHead(200, {
      'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const s = probe();
  console.log('Prototypen kører på http://localhost:' + PORT + '/');
  console.log('Lokal AI-bro:');
  console.log('  Claude Code : ' + (s.claude.available ? 'klar · ' + s.claude.detail : 'ikke klar · ' + s.claude.detail));
  console.log('  Codex CLI   : ' + (s.codex.available ? 'klar · ' + s.codex.detail : 'ikke klar · ' + s.codex.detail));
});
