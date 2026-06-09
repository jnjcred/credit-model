// Customer-facing case status page — shows bank's processing progress

function WSCustomerStatus() {
  const co = DATA.COMPANY;

  const stages = [
    { k: "oprettet",   label: "Sag oprettet",       date: "24. maj 2026",    done: true  },
    { k: "materiale",  label: "Materialeindsamling", date: "24–28. maj 2026", done: true  },
    { k: "analyse",    label: "Kreditanalyse",       date: "Igangværende",    active: true },
    { k: "indstilling",label: "Kreditindstilling",   date: "Forventet uge 24",upcoming: true },
    { k: "afgorelse",  label: "Afgørelse",           date: "Forventet uge 25",upcoming: true },
  ];

  const QUESTIONS = [
    {
      id: 1,
      subject: "Spørgsmål til budgettet",
      date: "27. maj, 09:14",
      text: "Hej Anders, tak for budgettet. Jeg ser at I har en stigning fra 2,0M i juni til 2,5M i juli — en stigning på 25% som ikke følger jeres normale sæsonmønster. Kan I bekræfte hvad der ligger bag? Er det Block-Island leverancen til GE Vernova der slår igennem her?",
      docRef: { name: "Budget_2026-28_v3.xlsx", note: "linje 197, juli 2026" },
      severity: "warn",
    },
    {
      id: 2,
      subject: "Tilbagetrædelseserklæring mangler",
      date: "27. maj, 09:14",
      text: "Vi mangler tilbagetrædelseserklæring for anpartshaverlånet på DKK 0,5M. Kan I uploade dette dokument hurtigst muligt?",
      docRef: null,
      severity: "warn",
      requestDoc: true,
    },
    {
      id: 3,
      subject: "Sikkerhedsdokumentation",
      date: "27. maj, 09:14",
      text: "Pantebrev for maskinerne og personlig kaution er endnu ikke modtaget. Kan I uploade disse dokumenter?",
      docRef: null,
      severity: "info",
      requestDoc: true,
    },
  ];

  const DOCS_INIT = [
    { name: "Aarsrapport_2025.pdf",       status: "ok",      note: "Modtaget 23. maj" },
    { name: "Aarsrapport_2024.pdf",       status: "ok",      note: "Modtaget 23. maj" },
    { name: "Aarsrapport_2023.pdf",       status: "ok",      note: "Modtaget 23. maj" },
    { name: "Budget_2026-28_v3.xlsx",     status: "ok",      note: "Modtaget 24. maj" },
    { name: "Periodetal_Q1-2026.xlsx",    status: "ok",      note: "Automatisk fra e-conomic" },
    { name: "Ejerbog_2026.pdf",           status: "ok",      note: "Modtaget 23. maj" },
    { name: "GE_Vernova_kontrakt.pdf",    status: "ok",      note: "Modtaget 26. maj" },
    { name: "CVR_udtraek_2026-05-30.pdf", status: "ok",      note: "Automatisk fra CVR" },
    { name: "PEP-erklæring",             status: "ok",      note: "Signeret 24. maj med MitID" },
    { name: "Pantebrev_maskiner.pdf",     status: "ok",      note: "Modtaget 28. maj" },
    { name: "Personlig_kaution_AC.pdf",   status: "ok",      note: "Modtaget 28. maj" },
    { name: "Tilbagetrædelseserklæring",  status: "ok",      note: "Modtaget 28. maj" },
  ];

  const [docs, setDocs] = React.useState(DOCS_INIT);
  const [replies, setReplies] = React.useState({});
  const [attachments, setAttachments] = React.useState({});
  const [activeReply, setActiveReply] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(new Set());
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [addingQuestion, setAddingQuestion] = React.useState(false);
  const [newQuestion, setNewQuestion] = React.useState('');
  const [newQuestionFiles, setNewQuestionFiles] = React.useState([]);
  const [customerQuestions, setCustomerQuestions] = React.useState([]);

  const docsOk = docs.filter(d => d.status === "ok").length;

  function attachFile(id, fileName) {
    setAttachments(prev => ({ ...prev, [id]: [...(prev[id] || []), { name: fileName, size: Math.floor(Math.random() * 400 + 80) + ' KB' }] }));
  }

  function removeAttachment(id, idx) {
    setAttachments(prev => ({ ...prev, [id]: prev[id].filter((_, i) => i !== idx) }));
  }

  function submitReply(id) {
    setSubmitted(prev => new Set([...prev, id]));
    setActiveReply(null);
  }

  function handleDrop(fileName) {
    setDrag(false);
    setDocs(prev => {
      const existing = prev.findIndex(d => d.name === fileName || d.status === 'pending');
      if (existing !== -1) {
        return prev.map((d, i) => i === existing ? { ...d, status: 'ok', note: 'Uploadet nu' } : d);
      }
      return [...prev, { name: fileName, status: 'ok', note: 'Uploadet nu' }];
    });
    setUploadOpen(false);
  }

  const unanswered = QUESTIONS.filter(q => !submitted.has(q.id)).length;

  return (
    <div className="scroll">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* ── Company header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--c-ink)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>NC</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>{co.name}</div>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
              <span>Sagsnr. 2026-0184</span>
              <span style={{ color: 'var(--c-line-strong)' }}>·</span>
              <span>Ansvarlig: Mette Larsen</span>
            </div>
          </div>
        </div>

        {/* ── Progress timeline ── */}
        <div className="card" style={{ marginBottom: 20, padding: '28px 32px' }}>
          <div className="label-mini" style={{ marginBottom: 20 }}>Behandlingsstatus</div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {stages.map((s, i) => (
              <div key={s.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i < stages.length - 1 && (
                  <div style={{ position: 'absolute', top: 14, left: '50%', width: '100%', height: 2, background: s.done ? 'var(--c-ink)' : 'var(--c-line-2)', zIndex: 0 }}/>
                )}
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: s.done ? 'var(--c-ink)' : s.active ? 'var(--c-primary)' : 'var(--c-surface-2)', border: s.upcoming ? '2px solid var(--c-line-strong)' : 'none', color: s.done || s.active ? '#fff' : 'var(--c-text-3)', zIndex: 1, position: 'relative', boxShadow: s.active ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none' }}>
                  {s.done ? <I.Check size={13}/> : s.active ? <I.Refresh size={12}/> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-line-strong)' }}/>}
                </div>
                <div style={{ marginTop: 10, textAlign: 'center', padding: '0 4px' }}>
                  <div style={{ fontSize: 12, fontWeight: s.active ? 700 : 500, color: s.done ? 'var(--c-ink)' : s.active ? 'var(--c-primary)' : 'var(--c-text-3)' }}>{s.label}</div>
                  <div style={{ fontSize: 10.5, color: s.active ? 'var(--c-primary)' : 'var(--c-text-4)', marginTop: 2 }}>{s.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Questions / Dialog ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head" style={{ borderBottom: '1px solid var(--c-line-2)' }}>
            <div className="card-title">Spørgsmål fra kreditafdelingen</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text-3)' }}>
              <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>ML</div>
              Mette Larsen
            </div>
          </div>

          <div>
            {false && QUESTIONS.map((q, i) => {
              const isAnswered = submitted.has(q.id);
              const isOpen = activeReply === q.id;
              const replyText = replies[q.id] || '';

              return (
                <div key={q.id} style={{ borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none', padding: '18px 20px' }}>
                  {/* Question header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: isAnswered ? 'var(--c-success)' : q.severity === 'warn' ? 'var(--c-warn)' : 'var(--c-primary)' }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{q.subject}</span>
                        <span style={{ fontSize: 11, color: 'var(--c-text-4)' }}>{q.date}</span>
                        {isAnswered && (
                          <span style={{ fontSize: 11, color: 'var(--c-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <I.Check size={10}/> Besvaret
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.65 }}>{q.text}</div>

                      {/* Doc reference */}
                      {q.docRef && (
                        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 10px', background: 'var(--c-surface-2)', borderRadius: 6, fontSize: 12, color: 'var(--c-text-2)', border: '1px solid var(--c-line-2)' }}>
                          <I.File size={11}/>
                          <b style={{ color: 'var(--c-ink)' }}>{q.docRef.name}</b>
                          <span style={{ color: 'var(--c-text-4)' }}>·</span>
                          {q.docRef.note}
                        </div>
                      )}

                      {/* Submitted reply preview */}
                      {isAnswered && (replyText || (attachments[q.id] || []).length > 0) && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, fontSize: 12.5, color: 'var(--c-text)', lineHeight: 1.6 }}>
                          <div style={{ fontSize: 10.5, color: 'var(--c-success)', fontWeight: 600, marginBottom: 6 }}>Dit svar</div>
                          {replyText && <div style={{ marginBottom: (attachments[q.id] || []).length ? 8 : 0 }}>{replyText}</div>}
                          {(attachments[q.id] || []).map((f, fi) => (
                            <div key={fi} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', background: 'rgba(34,197,94,0.1)', borderRadius: 5, fontSize: 11.5, marginRight: 6 }}>
                              <I.File size={11}/> {f.name} <span style={{ color: 'var(--c-text-4)' }}>{f.size}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply area */}
                      {!isAnswered && isOpen && (
                        <div style={{ marginTop: 12 }}>
                          <textarea
                            value={replyText}
                            onChange={e => setReplies(r => ({ ...r, [q.id]: e.target.value }))}
                            rows={3}
                            autoFocus
                            placeholder="Skriv dit svar her..."
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--c-line-strong)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.55, color: 'var(--c-text)', outline: 'none', boxSizing: 'border-box' }}
                          />
                          {/* Attached files */}
                          {(attachments[q.id] || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              {(attachments[q.id] || []).map((f, fi) => (
                                <div key={fi} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 6, fontSize: 12 }}>
                                  <I.File size={11} style={{ color: 'var(--c-text-3)' }}/> {f.name} <span style={{ color: 'var(--c-text-4)' }}>{f.size}</span>
                                  <button onClick={() => removeAttachment(q.id, fi)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--c-text-3)', padding: '0 2px', display: 'flex', alignItems: 'center' }}><I.X size={11}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => attachFile(q.id, "Dokument_" + (q.id) + ".pdf")}
                            >
                              <I.Upload size={12}/> Vedhæft fil
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-sm btn-ghost" onClick={() => setActiveReply(null)}>Annullér</button>
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={!replyText.trim() && !(attachments[q.id] || []).length}
                                onClick={() => submitReply(q.id)}
                                style={(replyText.trim() || (attachments[q.id] || []).length) ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { opacity: 0.45, cursor: 'not-allowed' }}
                              >
                                <I.Send size={12}/> Send svar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CTA */}
                      {!isAnswered && !isOpen && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm" onClick={() => setActiveReply(q.id)}>
                            Svar
                          </button>
                          {q.requestDoc && (
                            <button className="btn btn-sm btn-ghost" onClick={() => setUploadOpen(true)}>
                              <I.Upload size={12}/> Upload dokument
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--c-text-3)', fontSize: 13 }}>
              Ingen spørgsmål på nuværende tidspunkt
            </div>
          </div>
        </div>

        {/* ── Documents ── */}
        <div className="card">
          <div className="card-head" style={{ borderBottom: '1px solid var(--c-line-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="card-title">Dokumenter</div>
              <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{docsOk}/{docs.length} modtaget</span>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setUploadOpen(o => !o)}>
              <I.Upload size={12}/> Upload nyt dokument
            </button>
          </div>

          {/* Upload drop zone */}
          {uploadOpen && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-line-2)', background: 'var(--c-surface-2)' }}>
              <div
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); handleDrop("Nyt_dokument.pdf"); }}
                onClick={() => handleDrop("Nyt_dokument.pdf")}
                style={{
                  border: '2px dashed ' + (drag ? 'var(--c-primary)' : 'var(--c-line-strong)'),
                  background: drag ? 'rgba(59,130,246,0.05)' : '#fff',
                  borderRadius: 10, padding: '24px 16px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                <I.Upload size={20} style={{ color: 'var(--c-text-3)', marginBottom: 8 }}/>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>Træk filer hertil - eller klik for at vælge</div>
                <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 4 }}>PDF, Excel, Word · max 50 MB pr. fil</div>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ margin: '12px 18px 4px', height: 4, borderRadius: 999, background: 'var(--c-line-2)', overflow: 'hidden' }}>
            <div style={{ width: (docsOk / docs.length * 100) + '%', height: '100%', background: 'var(--c-primary)', borderRadius: 999, transition: 'width 400ms' }}/>
          </div>

          <div style={{ padding: '4px 0 8px' }}>
            {docs.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 18px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
                {d.status === 'ok'
                  ? <I.Check size={13} style={{ color: 'var(--c-success)', flexShrink: 0 }}/>
                  : d.status === 'pending'
                  ? <I.Clock size={13} style={{ color: 'var(--c-warn)', flexShrink: 0 }}/>
                  : <I.AlertCircle size={13} style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: d.status === 'ok' ? 'var(--c-text)' : d.status === 'pending' ? 'var(--c-warn)' : 'var(--c-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 1 }}>{d.note}</div>
                </div>
                {d.status !== 'ok' && (
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: 11.5 }} onClick={() => handleDrop(d.name)}>
                    <I.Upload size={11}/> Upload
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

window.WSCustomerStatus = WSCustomerStatus;
