// Dataanmodninger - alle materialeanmodninger på tværs af sager.
// Rækkerne kommer fra DATA.requestRows(): Nordhavn følger den fælles
// sagstilstand (window.CW), de øvrige er demodata med datoer regnet fra i dag.
// Frister: "Kundens svarfrist" er anmodningens frist; "Sagsfrist" er sagens
// egen frist og er den samme som i sagshovedet. Rækken viser svarfristen;
// begge står i detaljerne.
// Ingen knap her ændrer sagens fase. Faseskift sker kun i sagen via
// CW.requestStage; herfra åbnes sagen bare det rette sted.
// En sag, der er afslået, indstillet eller afgjort, er lukket for kunden
// (status 'closed', CW.customerLock): ingen Påmind, Vælg materiale eller
// Anmod om mere, kun "Åbn sag" og på en afslået sag "Genoptag sag".

const STUCK_HELP = 'Sidder fast: anmodningen er sendt, men kunden har ikke leveret noget i 3 hverdage.';
// Kort betegnelse for en lukket sag
const LOCK_LABEL = { declined: 'Sagen er afslået', submitted: 'Indstillet', decided: 'Sagen er afgjort' };
const WAITING_HELP = 'Anmodningen er sendt, men kunden har ikke leveret noget endnu.';
const CLOSED_HELP = 'Sagen er afslået, indstillet eller afgjort. Kunden kan ikke levere mere på den.';

function reqClock(iso) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function reqNames(list) {
  const names = list.map(r => r.contact || r.company).filter(Boolean);
  return names.length <= 1 ? (names[0] || '') : names.slice(0, -1).join(', ') + ' ' + t('og') + ' ' + names[names.length - 1];
}
function reqFill(s, map) { return Object.keys(map).reduce((a, k) => a.split('{' + k + '}').join(map[k]), s); }
// Danske datoer slutter med punktum ("24. sep."): ingen dobbelt punktum i en sætning
function reqDot(s) { return s.replace(/\.\.$/, '.'); }

// Påmindelse: Nordhavn skriver i sagens historik (CW.remind), de øvrige i en
// lokal historik. Rækken viser bagefter "påmindet <dato>".
// Vagt mod dobbelte påmindelser: er kunden allerede påmindet i dag, spørger
// vi først (én række), eller springer dem over (samlet påmindelse).
function sendReminders(rows) {
  let list = rows.filter(r => r && r.status !== 'closed');
  if (!list.length) return;
  const today = list.filter(r => DATA.reminderToday(r.caseId));
  const send = (targets, skipped) => {
    targets.forEach(r => DATA.remindCase(r.caseId, DATA.ADVISOR.name));
    let msg = t('Påmindelse sendt til') + ' ' + reqNames(targets) + '. ' + t('Den står nu på rækken og i sagens historik.');
    if (skipped && skipped.length) msg += ' ' + reqNames(skipped) + ' ' + t('er allerede påmindet i dag og fik ingen ny.');
    CW.toast(msg);
  };
  if (!today.length) { send(list); return; }
  if (today.length < list.length) { send(list.filter(r => today.indexOf(r) < 0), today); return; }
  // Alle er påmindet i dag: spørg, før der sendes igen
  const last = DATA.reminderToday(today[0].caseId);
  const title = today.length === 1
    ? t('Påmindet i dag kl. {tid}. Send igen?').replace('{tid}', reqClock(last.at))
    : t('Alle er påmindet i dag. Send igen?');
  CW.confirm({
    title,
    text: (today.length === 1
      ? t('{navn} fik en påmindelse i dag kl. {tid} fra {af}.').replace('{navn}', reqNames(today)).replace('{tid}', reqClock(last.at)).replace('{af}', last.by)
      : reqNames(today) + ' ' + t('har alle fået en påmindelse i dag.'))
      + ' ' + t('En ny påmindelse sendes med det samme og står i sagens historik.'),
    confirmLabel: t('Send igen'),
  }).then(res => { if (res && res.ok) send(today); });
}

// "Kundeside": samme forhåndsvisning (overlay) som i sagshovedet. Mangler den
// (workspace ikke indlæst), åbnes sagen, hvor knappen findes.
function openCustomerPreview(go) {
  if (typeof window.CW_OPEN_CUSTOMER_PREVIEW === 'function') { window.CW_OPEN_CUSTOMER_PREVIEW(); return; }
  if (go) go('workspace:1');
}

// Åbn sagen det rette sted uden at ændre fasen
function openRequestCase(r, target) {
  if (r.caseId === 1 && target === 'ws-material') {
    try { sessionStorage.setItem('kabul:focus-material', '1'); } catch (e) {}
  }
  window.cwOpenCase(r.caseId, r.caseId === 1 ? target : null);
}

function reminderLine(r) {
  if (!r.lastReminder) return null;
  return t('Påmindet {dato} af {navn}').replace('{dato}', DATA.fmt.shortDate(r.lastReminder.at)).replace('{navn}', r.lastReminder.by);
}

// Frist relativt til i dag ("om 12 dage", "overskredet 2 dage"). Kun ordet
// "overskredet" er rødt, uden fed og uden ikon.
function DeadlineRel({ dl }) {
  const m = dl.text.match(/^(.*?)(overskredet|overdue)(.*)$/);
  if (!dl.overdue || !m) return <>{dl.text}</>;
  return <>{m[1]}<CWStatus tone="danger">{m[2]}</CWStatus>{m[3]}</>;
}

// Rækkens ene grå linje: "2 af 8 modtaget · sidder fast siden 24. sep. · påmindet 28. sep."
function requestMeta(r) {
  const F = DATA.fmt;
  const closed = r.status === 'closed';
  const parts = [];
  if (r.status === 'draft') parts.push(t('Ikke sendt') + ' · ' + r.total + ' ' + (r.total === 1 ? t('punkt') : t('punkter')));
  else parts.push(reqFill(t('{n} af {m} modtaget'), { n: r.received, m: r.total }));
  if (closed) parts.push(t(LOCK_LABEL[r.closed] || 'Lukket'));
  else if (r.status === 'stuck') parts.push(t('sidder fast siden') + ' ' + F.shortDate(r.lastActivityAt || r.sentAt));
  else if (r.status === 'waiting') parts.push(t('sendt') + ' ' + F.shortDate(r.sentAt));
  else if (r.status === 'active' && r.lastActivityAt) parts.push(t('seneste aktivitet') + ' ' + F.ago(r.lastActivityAt));
  if (r.lastReminder && !closed) parts.push(t('påmindet') + ' ' + F.shortDate(r.lastReminder.at));
  return parts.join(' · ');
}

function DataRequests({ go }) {
  CW.useCase();
  // Påmindelser på sager uden levende data gemmes lokalt og sender deres eget event
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const on = () => setTick(n => n + 1);
    window.addEventListener('cw-reminders-changed', on);
    return () => window.removeEventListener('cw-reminders-changed', on);
  }, []);
  const [filter, setFilter] = React.useState("all");
  const [owner, setOwner] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState(null);

  const allRows = DATA.requestRows();
  const requests = owner === 'all' ? allRows : allRows.filter(r => r.owner === owner);
  const selected = requests.find(r => r.id === selectedId) || null;

  const counts = {
    active: requests.filter(r => r.status === 'active').length,
    waiting: requests.filter(r => r.status === 'waiting').length,
    stuck: requests.filter(r => r.status === 'stuck').length,
    ready: requests.filter(r => r.status === 'ready').length,
    draft: requests.filter(r => r.status === 'draft').length,
    closed: requests.filter(r => r.status === 'closed').length,
    all: requests.length,
  };
  const toReviewRows = requests.filter(r => r.toReview > 0 && r.status !== 'closed');
  const stuckRows = requests.filter(r => r.status === 'stuck');

  // Fanerne er det eneste sted med tal
  const tabs = [
    { k: "all", l: "Alle", n: counts.all },
    { k: "active", l: "Aktive", n: counts.active },
    counts.waiting > 0 && { k: "waiting", l: "Afventer kunden", n: counts.waiting, help: WAITING_HELP },
    { k: "stuck", l: "Sidder fast", n: counts.stuck, help: STUCK_HELP },
    { k: "ready", l: "Komplette", n: counts.ready },
    { k: "draft", l: "Ikke sendt", n: counts.draft },
    counts.closed > 0 && { k: "closed", l: "Lukkede", n: counts.closed, help: CLOSED_HELP },
  ].filter(Boolean);
  const tab = tabs.some(x => x.k === filter) ? filter : 'all';
  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab);

  // Én sætning om det, der kræver noget af rådgiveren
  const nRev = toReviewRows.length, nStuck = stuckRows.length;
  const rev = nRev ? reqFill(nRev === 1 ? t('1 har materiale til gennemgang') : t('{n} har materiale til gennemgang'), { n: nRev }) : '';
  const stuck = nStuck ? reqFill(nStuck === 1 ? t('1 kunde sidder fast') : t('{n} kunder sidder fast'), { n: nStuck }) : '';
  const sub = rev && stuck ? reqFill(t('{a}, og {b}.'), { a: rev, b: stuck })
    : rev || stuck ? (rev || stuck) + '.'
    : t('Ingen anmodninger kræver noget af dig lige nu.');

  return (
    <>
      {/* Ingen knapper i topbjælken: sidebjælkens "Ny sag" er skærmens eneste primærknap */}
      <Topbar crumbs={[t('Dataanmodninger')]} right={null}/>
      <div className="scroll">
        <div className="page page-wide" style={{ maxWidth: 1100 }}>
          <div className="page-head">
            <div>
              <h1 className="page-title">{t('Dataanmodninger')}</h1>
              <div className="page-sub">
                {owner !== 'all' && <>{owner}: </>}{sub}
              </div>
            </div>
          </div>

          {/* Faner, samlet påmindelse (kun på Sidder fast) og ansvarlig */}
          <div className="list-toolbar">
            <ListTabs idBase="cw-req" ariaLabel={t('Filtrér anmodninger')} value={tab} onChange={setFilter}
              tabs={tabs.map(x => ({ k: x.k, l: t(x.l), n: x.n, help: x.help ? t(x.help) : undefined }))}/>
            <div className="list-toolbar-tools">
              {tab === 'stuck' && stuckRows.length > 0 && (
                <button type="button" className="btn-ghost-sm" onClick={() => sendReminders(stuckRows)}
                  aria-label={t('Påmind alle, der sidder fast') + ' (' + stuckRows.length + ')'}>
                  <I.Send size={12} aria-hidden="true"/> {t('Påmind alle')} ({stuckRows.length})
                </button>
              )}
              <FilterDropdown label={t('Ansvarlig')} value={owner} onChange={(v) => { setOwner(v); setSelectedId(null); }}
                options={[{ v: 'all', l: t('Alle rådgivere') }].concat(DATA.TEAM.map(m => ({ v: m.short, l: m.short })))} neutral/>
            </div>
          </div>

          <div role="tabpanel" id="cw-req-panel" aria-labelledby={'cw-req-' + tab}>
            {filtered.length === 0 ? (
              <p className="list-empty">{t('Ingen anmodninger her')}</p>
            ) : (
              <div className="card req-list">
                {filtered.map(r => (
                  <DataRequestRow key={r.id} r={r} onSelect={() => setSelectedId(r.id)}/>
                ))}
              </div>
            )}
          </div>
          {selected && <DataRequestModal r={selected} onClose={() => setSelectedId(null)} go={go}/>}
        </div>
      </div>
    </>
  );
}

// Én række: fed firmanavn og én grå linje; til højre ansvarlig og svarfrist
// i grå; handlingen som ghost-knap. Et klik på rækken (eller navnet) åbner
// detaljerne i en modal.
function DataRequestRow({ r, onSelect }) {
  const F = DATA.fmt;
  const dl = F.deadline(r.deadline);
  const closed = r.status === 'closed';
  const late = r.sentAt && dl.overdue && r.status !== 'ready' && !closed;
  const showDl = r.deadline && !closed && r.status !== 'ready';
  let action;
  if (closed) action = <button type="button" onClick={() => window.cwOpenCase(r.caseId)} className="btn-ghost-sm req-act" aria-label={t('Åbn sag') + ' ' + r.company} title={t(CLOSED_HELP)}>{t('Åbn sag')}</button>;
  else if (r.toReview > 0) action = <button type="button" onClick={() => openRequestCase(r, 'ws-outstanding')} className="btn-ghost-sm req-act" aria-label={t('Gennemgå') + ' ' + r.toReview + ' ' + t('punkter fra') + ' ' + r.company}>{t('Gennemgå')} ({r.toReview})</button>;
  else if (r.status === 'active' || r.status === 'stuck' || r.status === 'waiting') action = <button type="button" onClick={() => sendReminders([r])} className="btn-ghost-sm req-act" aria-label={t('Påmind') + ' ' + (r.contact || r.company)}>{t('Påmind')}</button>;
  else if (r.status === 'ready') action = <button type="button" onClick={() => window.cwOpenCase(r.caseId)} className="btn-ghost-sm req-act" aria-label={t('Åbn sag') + ' ' + r.company}>{t('Åbn sag')}</button>;
  else action = <button type="button" onClick={() => openRequestCase(r, 'ws-material')} className="btn-ghost-sm req-act" title={t('Åbner sagen. Anmodningen sendes derfra.')} aria-label={t('Vælg materiale til') + ' ' + r.company}>{t('Vælg materiale')}</button>;
  return (
    <div onClick={onSelect} className="req-row cw-row">
      <div className="cw-row-main">
        <span className="cw-row-title req-row-title">
          <button type="button" className="cw-filelink req-open" aria-haspopup="dialog" title={t('Vis detaljer')}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}>{r.company}</button>
          {r.openQuestions > 0 && !closed && (
            <button type="button" className="req-q" onClick={(e) => { e.stopPropagation(); openRequestCase(r, 'ws-dialog-title'); }}
              title={t('Åbn dialogen med kunden')}>
              {r.openQuestions} {r.openQuestions === 1 ? t('spørgsmål åbent') : t('spørgsmål åbne')}
            </button>
          )}
        </span>
        <span className="cw-row-meta">{requestMeta(r)}</span>
      </div>
      <div className="cw-row-cat" title={showDl ? t('Kundens svarfrist') : undefined}>
        {r.owner || '-'}
        {showDl && <> · {t('svarfrist')} {dl.date}{late && <> · <CWStatus tone="danger">{t('overskredet')}</CWStatus></>}</>}
      </div>
      <div className="cw-row-actions" onClick={(e) => e.stopPropagation()}>{action}</div>
    </div>
  );
}

// Tidslinje for anmodningen. Nordhavn læser sagens historik (CW.activity),
// de øvrige bygges af demodata og den lokale påmindelseshistorik.
const REQ_EVENT_TYPES = ['request-sent', 'request-updated', 'received', 'noted', 'delegated', 'reminder', 'customer-submitted', 'question', 'reply', 'consent'];
function requestEvents(r) {
  if (r.caseId === 1) {
    return CW.activity().filter(e => REQ_EVENT_TYPES.indexOf(e.type) >= 0).slice(-8).reverse().map(e => ({
      t: e.type === 'reminder' ? t('Påmindelse sendt af') + ' ' + ((e.data && e.data.by) || DATA.ADVISOR.name) : e.text, raw: true, at: e.at,
    }));
  }
  const list = [];
  if (r.sentAt) list.push({ at: r.sentAt, t: 'Anmodning sendt' });
  if (r.openedAt) list.push({ at: r.openedAt, t: 'Åbnet af modtager' });
  if (r.lastActivityAt && r.lastActivityAt !== r.sentAt) list.push({ at: r.lastActivityAt, t: r.lastAction });
  DATA.remindersFor(r.caseId).forEach(x => list.push({ at: x.at, t: t('Påmindelse sendt af') + ' ' + x.by, raw: true }));
  return list.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// Detaljer i en modal med firmanavnet som titel, én sætning om status, stille
// rækker, "Aktivitet (n)" foldet og én primærknap efter tilstand.
function DataRequestModal({ r, onClose, go }) {
  const F = DATA.fmt;
  const ref = React.useRef(null);
  CW.useDialog(ref, true, onClose);
  const isNordhavn = r.caseId === 1;
  const closed = r.status === 'closed';
  const events = requestEvents(r);
  const reminded = reminderLine(r);
  const dl = F.deadline(r.deadline);
  const caseDl = r.caseDeadline ? F.deadline(r.caseDeadline) : null;
  // Afslået levende sag: genoptag via CW.requestStage (spørger først)
  const reopen = () => {
    const cs = CW.caseState() || {};
    CW.requestStage(cs.declinedFrom || 'review-public').then(ok => { if (ok) CW.toast(t('Sagen er genoptaget. Kunden kan levere igen.')); });
  };
  const since = F.shortDate(r.lastActivityAt || r.sentAt);
  const sentence = reqDot(closed ? t(r.lastAction)
    : r.status === 'draft' ? t('Anmodningen er ikke sendt. Materialet vælges og sendes i sagen.')
    : r.toReview > 0 ? (r.toReview === 1 ? t('1 punkt venter på din gennemgang.') : reqFill(t('{n} punkter venter på din gennemgang.'), { n: r.toReview }))
    : r.status === 'ready' ? t('Kunden har leveret alt materialet.')
    : r.status === 'stuck' ? reqFill(t('Kunden har ikke været aktiv siden {dato}.'), { dato: since })
    : r.status === 'waiting' ? reqFill(t('Anmodningen er sendt {dato}. Kunden har ikke leveret noget endnu.'), { dato: F.shortDate(r.sentAt) })
    : t('Kunden leverer løbende.'));

  // Én primærknap efter tilstand
  let primary;
  if (!closed && r.toReview > 0) primary = { l: t('Gennemgå') + ' (' + r.toReview + ')', on: () => openRequestCase(r, 'ws-outstanding') };
  else if (r.status === 'active' || r.status === 'stuck' || r.status === 'waiting') primary = { l: t('Påmind'), on: () => sendReminders([r]) };
  else if (r.status === 'draft') primary = { l: t('Vælg materiale'), on: () => openRequestCase(r, 'ws-material') };
  else primary = { l: t('Åbn sag'), open: true, on: () => window.cwOpenCase(r.caseId) };

  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ alignItems: 'start', paddingTop: 60 }}>
      <div ref={ref} className="modal req-modal" role="dialog" aria-modal="true" aria-labelledby="cw-req-title"
        style={{ width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 100px)' }}>
        <div className="modal-head" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="cw-req-title" className="modal-title" style={{ margin: 0 }}>{r.company}</h2>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>{sentence}</div>
          </div>
          <button type="button" className="icon-btn" aria-label={t('Luk detaljer')} title={t('Luk')} onClick={onClose}><I.X size={15}/></button>
        </div>
        <div className="modal-body" style={{ padding: '4px 22px 6px' }}>
          {/* Fremdrift */}
          <div className="cw-row">
            <div className="cw-row-main">
              <span className="cw-row-title">{r.status === 'draft' ? t('Ikke sendt') : reqFill(t('{n} af {m} punkter modtaget'), { n: r.received, m: r.total })}</span>
              {reminded && !closed && <span className="cw-row-meta">{reminded}</span>}
            </div>
            {!closed && r.status !== 'draft' && (
              <div className="cw-row-actions">
                <button type="button" className="btn-ghost-sm" onClick={() => openRequestCase(r, 'ws-material')}
                  title={t('Åbner sagen. Anmodningen ændres og sendes derfra.')}>{t('Anmod om mere materiale')}</button>
              </div>
            )}
          </div>
          {/* Modtager */}
          <div className="cw-row">
            <div className="cw-row-main">
              <span className="cw-row-title">{r.contact || t('Ingen modtager valgt')}</span>
              {r.email && <span className="cw-row-meta">{r.email}{r.role ? ' · ' + t(r.role) : ''}</span>}
            </div>
            <div className="cw-row-actions">
              {isNordhavn && <button type="button" className="btn-ghost-sm" onClick={() => { onClose(); openCustomerPreview(go); }}>{t('Kundeside')}</button>}
              <span className="cw-row-cat">{t('Modtager')}</span>
            </div>
          </div>
          {r.deadline && !closed && (
            <div className="cw-row">
              <div className="cw-row-main">
                <span className="cw-row-title">{dl.date}</span>
                <span className="cw-row-meta">{r.status === 'ready' ? t('Komplet') : <DeadlineRel dl={dl}/>}</span>
              </div>
              <span className="cw-row-cat">{t('Kundens svarfrist')}</span>
            </div>
          )}
          {r.openQuestions > 0 && !closed && (
            <div className="cw-row">
              <div className="cw-row-main">
                <span className="cw-row-title">{r.openQuestions} {t('spørgsmål fra kunden venter på svar')}</span>
              </div>
              <div className="cw-row-actions">
                <button type="button" className="btn-ghost-sm" onClick={() => openRequestCase(r, 'ws-dialog-title')}>{t('Åbn dialogen')}</button>
              </div>
            </div>
          )}
          {isNordhavn && r.closed === 'submitted' && (
            <p style={{ margin: '4px 0 10px', fontSize: 12.5, color: 'var(--c-text-3)', lineHeight: 1.45 }}>{t('Skal kunden levere mere, trækkes indstillingen tilbage i sagen med en årsag.')}</p>
          )}
          {events.length > 0 && (
            <CWFold id="cw-req-activity" label={t('Aktivitet')} count={events.length}>
              {events.map((a, i) => (
                <div key={i} className="cw-row req-ev">
                  <div className="cw-row-main"><span>{a.raw ? a.t : t(a.t)}</span></div>
                  <span className="cw-row-cat" title={CW.fmtWhen(a.at)}>{F.shortDate(a.at)}</span>
                </div>
              ))}
            </CWFold>
          )}
        </div>
        <div className="modal-foot" style={{ alignItems: 'center' }}>
          {isNordhavn && r.closed === 'declined' && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={reopen} title={t('Afslaget gemmes i sagens historik')}>{t('Genoptag sag')}</button>
          )}
          <span style={{ flex: 1 }}/>
          {!primary.open && <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.cwOpenCase(r.caseId)}>{t('Åbn sag')}</button>}
          <button type="button" className="btn btn-sm btn-primary" onClick={primary.on}>{primary.l}</button>
        </div>
      </div>
    </div>
  );
}

window.DataRequests = DataRequests;
