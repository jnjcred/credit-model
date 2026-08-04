/* ─────────────────────────────────────────────────────────────────────────────
   AI-lag: rådgiverens egen Claude- eller ChatGPT-konto

   Prototypen har ingen backend og ingen bundler, så kaldene går direkte fra
   browseren mod udbyderens API med brugerens egen nøgle. Det er derfor der
   ikke bruges en officiel SDK: der er intet byggetrin til at hente en npm-pakke,
   og begge udbydere understøtter direkte browserkald.

   Anthropic kræver headeren anthropic-dangerous-direct-browser-access for at
   tillade CORS fra en browser. Navnet er en advarsel: nøglen ligger hos klienten
   og kan ses af den der sidder ved maskinen. Det er acceptabelt i en prototype
   hvor rådgiveren bruger sin egen nøgle, men det må ikke gå i produktion sådan.
   ──────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var STORE = 'cw:ai-config:v1';

  var PROVIDERS = {
    anthropic: {
      id: 'anthropic',
      label: 'Claude',
      vendor: 'Anthropic',
      keyPrefix: 'sk-ant-',
      keyHint: 'sk-ant-api03-…',
      consoleUrl: 'https://console.anthropic.com/settings/keys',
      defaultModel: 'claude-opus-5',
      baseUrl: 'https://api.anthropic.com',
    },
    openai: {
      id: 'openai',
      label: 'ChatGPT',
      vendor: 'OpenAI',
      keyPrefix: 'sk-',
      keyHint: 'sk-proj-…',
      consoleUrl: 'https://platform.openai.com/api-keys',
      defaultModel: 'gpt-5.2',
      baseUrl: 'https://api.openai.com',
    },
    /* Tredje vej: prototypens egen dev-server kalder Claude Code eller Codex CLI
       på maskinen. De to kommandolinjer logger ind med selve abonnementet, så
       der bruges ingen API-kredit. Kræver ingen nøgle, men virker kun lokalt. */
    local: {
      id: 'local',
      label: 'Dit abonnement',
      vendor: 'din egen maskine',
      noKey: true,
      defaultModel: 'claude',
      engines: [
        { id: 'claude', label: 'Claude Code', hint: 'Bruger dit Claude-abonnement' },
        { id: 'codex', label: 'Codex CLI', hint: 'Bruger dit ChatGPT-abonnement' },
      ],
    },
  };

  /* ── Lokal bro ─────────────────────────────────────────────────────────── */

  var localStatus = null;

  async function probeLocal(force) {
    if (localStatus && !force) return localStatus;
    try {
      var res = await fetch('/local-ai/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('status ' + res.status);
      localStatus = await res.json();
    } catch (e) {
      localStatus = {
        claude: { available: false, detail: 'Dev-serveren svarer ikke. Kør devserver.js.' },
        codex: { available: false, detail: 'Dev-serveren svarer ikke. Kør devserver.js.' },
      };
    }
    return localStatus;
  }

  function localReady(cfg) {
    if (!localStatus) return false;
    var engine = (cfg || getConfig()).models.local || 'claude';
    return !!(localStatus[engine] && localStatus[engine].available);
  }

  async function localStream(opts, onDelta, signal) {
    // Broen tager én samlet prompt, så samtalen foldes ud som ren tekst
    var prompt = (opts.messages || []).map(function (m) {
      var body = typeof m.content === 'string' ? m.content : flatten(m.content);
      return m.role === 'assistant' ? 'Dit tidligere svar:\n' + body : body;
    }).join('\n\n');

    var res = await fetch('/local-ai/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ engine: opts.model || 'claude', system: opts.system || '', prompt: prompt }),
      signal: signal,
    });
    if (!res.ok) {
      var msg = 'Den lokale bro svarede ' + res.status + '.';
      try { var j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }

    var text = '';
    var failure = null;
    await readSSE(res, function (ev) {
      if (ev.error) { failure = ev.error; return; }
      // Anden parameter er den samlede tekst indtil nu. UI'et tegner efter den,
      // så uden den ser man kun en blinkende markør indtil svaret er færdigt.
      if (ev.delta) { text += ev.delta; onDelta(ev.delta, text); }
    });
    if (failure) throw new Error(failure);
    return { text: text, stopReason: 'end_turn' };
  }

  /* ── Konfiguration ─────────────────────────────────────────────────────── */

  function blankConfig() {
    return {
      provider: 'anthropic',
      keys: { anthropic: '', openai: '' },
      models: {
        anthropic: PROVIDERS.anthropic.defaultModel,
        openai: PROVIDERS.openai.defaultModel,
        // For den lokale bro er "model" hvilken kommandolinje der køres
        local: PROVIDERS.local.defaultModel,
      },
      // Tom = udbyderens eget endpoint. Kan pege på en firmaproxy eller et testmiljø.
      baseUrls: { anthropic: '', openai: '' },
    };
  }

  function baseUrlFor(pid, cfg) {
    var custom = cfg && cfg.baseUrls ? (cfg.baseUrls[pid] || '') : '';
    return (custom || PROVIDERS[pid].baseUrl).replace(/\/+$/, '');
  }

  function getConfig() {
    var cfg = blankConfig();
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && PROVIDERS[saved.provider]) cfg.provider = saved.provider;
        if (saved && saved.keys) {
          cfg.keys.anthropic = saved.keys.anthropic || '';
          cfg.keys.openai = saved.keys.openai || '';
        }
        if (saved && saved.models) {
          cfg.models.anthropic = saved.models.anthropic || cfg.models.anthropic;
          cfg.models.openai = saved.models.openai || cfg.models.openai;
          cfg.models.local = saved.models.local || cfg.models.local;
        }
        if (saved && saved.baseUrls) {
          cfg.baseUrls.anthropic = saved.baseUrls.anthropic || '';
          cfg.baseUrls.openai = saved.baseUrls.openai || '';
        }
      }
    } catch (e) { /* korrupt config: fald tilbage til blank */ }
    return cfg;
  }

  function setConfig(next) {
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('cw-ai-config-changed')); } catch (e) {}
    return next;
  }

  function clearConfig() {
    try { localStorage.removeItem(STORE); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('cw-ai-config-changed')); } catch (e) {}
  }

  function activeKey(cfg) { return (cfg || getConfig()).keys[(cfg || getConfig()).provider] || ''; }
  function activeModel(cfg) { cfg = cfg || getConfig(); return cfg.models[cfg.provider] || PROVIDERS[cfg.provider].defaultModel; }
  function isReady(cfg) {
    cfg = cfg || getConfig();
    // Den lokale bro har ingen nøgle; den er klar når kommandolinjen svarer
    if (cfg.provider === 'local') return localReady(cfg);
    return !!activeKey(cfg);
  }
  function provider(cfg) { return PROVIDERS[(cfg || getConfig()).provider]; }

  /* ── Fejlbeskeder på dansk ─────────────────────────────────────────────── */

  function friendlyError(status, body, prov) {
    var detail = '';
    var code = '';
    try {
      var j = typeof body === 'string' ? JSON.parse(body) : body;
      var e = j && j.error;
      detail = (e && (e.message || e.type)) || '';
      code = (e && (e.code || e.type)) || '';
    } catch (e2) { detail = typeof body === 'string' ? body.slice(0, 300) : ''; }

    var name = prov ? prov.label : 'udbyderen';
    var vendor = prov ? prov.vendor : 'udbyderen';
    // Udbyderens egen tekst siger næsten altid præcis hvad der er galt.
    // Den skal med, ellers gætter man i blinde.
    var raw = detail ? ' ' + vendor + ' skriver: “' + detail + '”' : '';
    var head;

    if (status === 401) head = 'Nøglen blev afvist af ' + name + '. Tjek at den er kopieret helt med, og at den ikke er tilbagekaldt.';
    else if (status === 403) head = 'Nøglen har ikke adgang til den valgte model. Vælg en anden model, eller brug en nøgle med bredere adgang.';
    else if (status === 404) head = 'Modellen findes ikke på din konto. Hent modellisten og vælg en fra listen.';
    else if (status === 413) head = 'Materialet er for stort til ét kald. Vælg færre dokumenter som grundlag.';
    else if (status === 429) {
      // 429 dækker to helt forskellige ting hos OpenAI: for mange kald i minuttet,
      // og en konto uden kredit. Det sidste er langt det almindeligste på en ny
      // nøgle, og "vent et øjeblik" er da et ubrugeligt råd.
      if (/insufficient_quota|billing|exceeded your current quota|credit balance/i.test(code + ' ' + detail)) {
        head = 'Der er ikke kredit nok på din ' + vendor + '-konto. Det er ikke en hastighedsgrænse: kontoen skal have et beløb sat ind, før nøglen kan bruges. ' +
               (prov && prov.id === 'openai'
                 ? 'Tjek platform.openai.com/settings/organization/billing.'
                 : 'Tjek console.anthropic.com/settings/billing.');
      } else {
        head = 'Du har ramt en hastighedsgrænse hos ' + name + '. Vent et øjeblik og prøv igen.';
      }
    }
    else if (status >= 500) head = name + ' svarer ikke lige nu (' + status + '). Prøv igen om lidt.';
    else if (detail) return detail + ' (' + status + ')';
    else head = 'Kaldet fejlede (' + status + ').';

    return head + raw;
  }

  /* Parametre som ældre eller nyere modeller kan afvise. Rammer vi en 400 der
     nævner en af dem, prøver vi igen uden. Det gør at brugeren kan vælge frit
     i modellisten uden at vi skal kende hver enkelt models parametersæt. */
  var OPTIONAL_PARAMS = ['effort', 'output_config', 'thinking', 'max_completion_tokens', 'budget_tokens'];

  function mentionsOptionalParam(body) {
    var s = typeof body === 'string' ? body : JSON.stringify(body || '');
    for (var i = 0; i < OPTIONAL_PARAMS.length; i++) {
      if (s.indexOf(OPTIONAL_PARAMS[i]) !== -1) return true;
    }
    return false;
  }

  /* ── SSE-parser, fælles for begge udbydere ─────────────────────────────── */

  async function readSSE(response, onEvent) {
    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      var parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (var i = 0; i < parts.length; i++) {
        var lines = parts[i].split('\n');
        var data = '';
        for (var j = 0; j < lines.length; j++) {
          var line = lines[j];
          if (line.indexOf('data:') === 0) data += line.slice(5).trim();
        }
        if (!data || data === '[DONE]') continue;
        try { onEvent(JSON.parse(data)); } catch (e) { /* ufuldstændig event, spring over */ }
      }
    }
  }

  /* ── Anthropic ─────────────────────────────────────────────────────────── */

  function anthropicHeaders(key) {
    return {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  function anthropicBody(opts, lean) {
    var body = {
      model: opts.model,
      max_tokens: opts.maxTokens || 16000,
      system: opts.system,
      messages: opts.messages,
      stream: true,
    };
    if (!lean) {
      // Adaptiv tænkning er standard på de nyeste Claude-modeller. Effort styrer
      // hvor dybt der tænkes; max_tokens dækker tænkning OG svar under ét.
      body.output_config = { effort: opts.effort || 'medium' };
    }
    return body;
  }

  async function anthropicStream(opts, onDelta, signal, lean) {
    var res = await fetch(opts.baseUrl + '/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders(opts.key),
      body: JSON.stringify(anthropicBody(opts, lean)),
      signal: signal,
    });
    if (!res.ok) {
      var text = await res.text();
      if (res.status === 400 && !lean && mentionsOptionalParam(text)) {
        return anthropicStream(opts, onDelta, signal, true);
      }
      var err = new Error(friendlyError(res.status, text, PROVIDERS.anthropic));
      err.status = res.status;
      throw err;
    }
    var out = '';
    var stopReason = null;
    await readSSE(res, function (ev) {
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
        out += ev.delta.text;
        onDelta(ev.delta.text, out);
      } else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) {
        stopReason = ev.delta.stop_reason;
      } else if (ev.type === 'error' && ev.error) {
        throw new Error(ev.error.message || 'Streamen fejlede.');
      }
    });
    if (stopReason === 'refusal') {
      throw new Error('Claude afviste opgaven af sikkerhedsgrunde. Omformulér instruktionen.');
    }
    return { text: out, stopReason: stopReason };
  }

  async function anthropicModels(key, base) {
    var res = await fetch(base + '/v1/models?limit=100', { headers: anthropicHeaders(key) });
    if (!res.ok) throw new Error(friendlyError(res.status, await res.text(), PROVIDERS.anthropic));
    var json = await res.json();
    return (json.data || []).map(function (m) { return { id: m.id, label: m.display_name || m.id }; });
  }

  /* ── OpenAI ────────────────────────────────────────────────────────────── */

  function openaiHeaders(key) {
    return { 'content-type': 'application/json', authorization: 'Bearer ' + key };
  }

  /* Anthropic tager indholdsblokke med cache_control. OpenAI cacher automatisk
     og vil have ren tekst, så blokkene lægges sammen til én streng. */
  function flatten(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(function (b) { return b && b.text ? b.text : ''; }).join('\n\n');
    }
    return String(content == null ? '' : content);
  }

  function openaiBody(opts, lean) {
    var msgs = [{ role: 'system', content: opts.system }].concat(opts.messages.map(function (m) {
      return { role: m.role, content: flatten(m.content) };
    }));
    var body = { model: opts.model, messages: msgs, stream: true };
    // Nyere OpenAI-modeller afviser max_tokens og kræver max_completion_tokens.
    // Ældre gør det omvendte, så vi falder tilbage ved en 400.
    if (lean) body.max_tokens = opts.maxTokens || 16000;
    else body.max_completion_tokens = opts.maxTokens || 16000;
    return body;
  }

  async function openaiStream(opts, onDelta, signal, lean) {
    var res = await fetch(opts.baseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: openaiHeaders(opts.key),
      body: JSON.stringify(openaiBody(opts, lean)),
      signal: signal,
    });
    if (!res.ok) {
      var text = await res.text();
      if (res.status === 400 && !lean && mentionsOptionalParam(text)) {
        return openaiStream(opts, onDelta, signal, true);
      }
      var err = new Error(friendlyError(res.status, text, PROVIDERS.openai));
      err.status = res.status;
      throw err;
    }
    var out = '';
    var finish = null;
    await readSSE(res, function (ev) {
      var choice = ev.choices && ev.choices[0];
      if (!choice) return;
      if (choice.delta && choice.delta.content) {
        out += choice.delta.content;
        onDelta(choice.delta.content, out);
      }
      if (choice.finish_reason) finish = choice.finish_reason;
    });
    return { text: out, stopReason: finish };
  }

  async function openaiModels(key, base) {
    var res = await fetch(base + '/v1/models', { headers: openaiHeaders(key) });
    if (!res.ok) throw new Error(friendlyError(res.status, await res.text(), PROVIDERS.openai));
    var json = await res.json();
    return (json.data || [])
      .map(function (m) { return { id: m.id, label: m.id }; })
      .filter(function (m) { return /^(gpt|o[0-9]|chatgpt)/i.test(m.id) && !/(audio|realtime|transcribe|tts|image|embedding|moderation|search)/i.test(m.id); })
      .sort(function (a, b) { return a.id < b.id ? 1 : -1; });
  }

  /* ── Offentligt API ────────────────────────────────────────────────────── */

  /**
   * Streamer et svar fra den valgte udbyder.
   * opts: { system, messages:[{role,content}], maxTokens, effort, onDelta, signal }
   * Returnerer { text, stopReason }.
   */
  async function stream(opts) {
    var cfg = getConfig();
    if (cfg.provider === 'local') {
      await probeLocal();
      if (!localReady(cfg)) {
        var le = new Error('Den lokale motor er ikke klar. Åbn indstillingerne og vælg en anden.');
        le.code = 'no-key';
        throw le;
      }
      try {
        return await localStream({
          model: cfg.models.local,
          system: opts.system || '',
          messages: opts.messages || [],
        }, opts.onDelta || function () {}, opts.signal);
      } catch (err) {
        if (err && err.name === 'AbortError') { var la = new Error('Afbrudt.'); la.code = 'abort'; throw la; }
        if (err instanceof TypeError) throw new Error('Kunne ikke nå dev-serveren. Kører devserver.js stadig?');
        throw err;
      }
    }
    var key = activeKey(cfg);
    if (!key) {
      var e = new Error('Der er ikke forbundet til Claude eller ChatGPT endnu.');
      e.code = 'no-key';
      throw e;
    }
    var full = {
      key: key,
      baseUrl: baseUrlFor(cfg.provider, cfg),
      model: opts.model || activeModel(cfg),
      system: opts.system || '',
      messages: opts.messages || [],
      maxTokens: opts.maxTokens,
      effort: opts.effort,
    };
    var onDelta = opts.onDelta || function () {};
    try {
      if (cfg.provider === 'anthropic') return await anthropicStream(full, onDelta, opts.signal, false);
      return await openaiStream(full, onDelta, opts.signal, false);
    } catch (err) {
      if (err && err.name === 'AbortError') { var a = new Error('Afbrudt.'); a.code = 'abort'; throw a; }
      if (err instanceof TypeError) {
        // fetch kaster TypeError ved netværks- og CORS-fejl
        throw new Error('Kunne ikke nå ' + provider(cfg).vendor + '. Tjek din netværksforbindelse.');
      }
      throw err;
    }
  }

  async function listModels(providerId, key, baseUrl) {
    var cfg = getConfig();
    var pid = providerId || cfg.provider;
    var k = key || cfg.keys[pid];
    if (!k) throw new Error('Indsæt først en API-nøgle.');
    var base = (baseUrl || '').replace(/\/+$/, '') || baseUrlFor(pid, cfg);
    if (pid === 'anthropic') return anthropicModels(k, base);
    return openaiModels(k, base);
  }

  /** Lille, billigt kald der bekræfter at nøgle og model virker. */
  async function testConnection(providerId, key, model, baseUrl) {
    var cfg = getConfig();
    var pid = providerId || cfg.provider;
    if (pid === 'local') {
      var st = await probeLocal(true);
      var engine = model || cfg.models.local || 'claude';
      if (!st[engine] || !st[engine].available) throw new Error(st[engine] ? st[engine].detail : 'Ukendt motor.');
      var out = await localStream({
        model: engine,
        system: 'Svar med præcis ordet OK. Intet andet.',
        messages: [{ role: 'user', content: 'Svar OK.' }],
      }, function () {});
      return (out.text || '').trim();
    }
    var opts = {
      key: key || cfg.keys[pid],
      baseUrl: (baseUrl || '').replace(/\/+$/, '') || baseUrlFor(pid, cfg),
      model: model || cfg.models[pid],
      system: 'Svar med præcis ordet OK. Intet andet.',
      messages: [{ role: 'user', content: 'Svar OK.' }],
      maxTokens: 2000,
      effort: 'low',
    };
    var res = pid === 'anthropic'
      ? await anthropicStream(opts, function () {}, undefined, false)
      : await openaiStream(opts, function () {}, undefined, false);
    return (res.text || '').trim();
  }

  window.AI = {
    PROVIDERS: PROVIDERS,
    getConfig: getConfig,
    setConfig: setConfig,
    clearConfig: clearConfig,
    isReady: isReady,
    activeModel: activeModel,
    provider: provider,
    stream: stream,
    listModels: listModels,
    testConnection: testConnection,
    probeLocal: probeLocal,
    localStatus: function () { return localStatus; },
  };

  // Prob den lokale bro med det samme, så isReady kender svaret når UI'et tegnes
  probeLocal().then(function () {
    try { window.dispatchEvent(new CustomEvent('cw-ai-config-changed')); } catch (e) {}
  });
})();
