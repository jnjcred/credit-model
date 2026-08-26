// Dataanmodninger - all active data collection links across cases
function DataRequests({ go }) {
  const [filter, setFilter] = React.useState("active");
  const [selected, setSelected] = React.useState(null);

  const requests = [
    { id: 1, company: "Nordhavn Composite A/S", contact: "Anders Nielsen", role: "CFO", email: "an@nordhavn-composite.dk", sent: "23. maj", deadline: "29. maj", progress: 83, opened: true, items: { received: 10, total: 12 }, lastActivity: "i dag · 09:01", status: "active", lastAction: "Uploadede 3 dokumenter", followup: true },
    { id: 2, company: "Vendia Bio ApS", contact: "Lise Krogh", role: "CFO", email: "lise@vendia.bio", sent: "20. maj", deadline: "03. jun", progress: 25, opened: true, items: { received: 2, total: 8 }, lastActivity: "i går · 14:22", status: "stuck", lastAction: "Åbnede sikkerhedssektion, ikke afsluttet" },
    { id: 3, company: "Refshaleøen Robotics", contact: "Jonas P.", role: "CEO", email: "jonas@refshaleoen-robotics.dk", sent: "16. maj", deadline: "12. jun", progress: 38, opened: true, items: { received: 3, total: 8 }, lastActivity: "4 dage siden", status: "stuck", lastAction: "Ingen aktivitet 4 dage" },
    { id: 4, company: "Marstal Maritime A/S", contact: "Birgit O.", role: "Økonomichef", email: "bo@marstal-maritime.dk", sent: "15. maj", deadline: "31. maj", progress: 100, opened: true, items: { received: 9, total: 9 }, lastActivity: "i dag · 11:14", status: "ready", lastAction: "Indsendt - afventer Mettes gennemgang" },
    { id: 5, company: "Skagen Klima ApS", contact: "Per Sørensen", role: "Direktør", email: "per@skagenklima.dk", sent: "12. maj", deadline: "27. maj", progress: 100, opened: true, items: { received: 7, total: 7 }, lastActivity: "2 dage siden", status: "ready", lastAction: "Komplet · 2 dage siden" },
    { id: 6, company: "Lyngbæk Industrier A/S", contact: "Steen M.", role: "CFO", email: "sm@lyngbaek.dk", sent: "21. maj", deadline: "02. jun", progress: 67, opened: true, items: { received: 6, total: 9 }, lastActivity: "i dag · 11:02", status: "active", lastAction: "Uploadede låneaftaler" },
    { id: 7, company: "Aalborg Hydrogen A/S", contact: "-", role: "-", email: "-", sent: null, deadline: "-", progress: 0, opened: false, items: { received: 0, total: 12 }, lastActivity: "Ikke afsendt", status: "draft", lastAction: "Udkast" },
  ];

  const counts = {
    active: requests.filter(r => r.status === 'active').length,
    stuck: requests.filter(r => r.status === 'stuck').length,
    ready: requests.filter(r => r.status === 'ready').length,
    draft: requests.filter(r => r.status === 'draft').length,
    all: requests.length,
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  return (
    <>
      <Topbar
        crumbs={[t('Dataanmodninger')]}
        right={
          <>
            <button className="btn btn-sm btn-ghost"><I.Download className="ic"/> {t('Eksport')}</button>
            <button className="btn btn-sm btn-primary"><I.Plus className="ic"/> {t('Ny anmodning')}</button>
          </>
        }
      />
      <div className="scroll">
        <div className="page page-wide" style={{ maxWidth: 1280 }}>
          <div className="page-head">
            <div>
              <h1 className="page-title">{t('Dataanmodninger')}</h1>
              <div className="page-sub">{t('7 aktive links · 1 indsendt · 2 sidder fast')}</div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
            <div className="kpi">
              <div className="kpi-lbl">{t('Aktive nu')}</div>
              <div className="kpi-val">{counts.active}</div>
              <div className="kpi-delta flat">{t('Modtager løbende')}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">{t('Sidder fast')}</div>
              <div className="kpi-val" style={{ color: 'var(--c-warn)' }}>{counts.stuck}</div>
              <div className="kpi-delta down" style={{ color: 'var(--c-warn)' }}><I.AlertCircle size={11}/> {t('Påmindelse anbefales')}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">{t('Klar til gennemgang')}</div>
              <div className="kpi-val" style={{ color: 'var(--c-success)' }}>{counts.ready}</div>
              <div className="kpi-delta up"><I.Check size={11}/> {t('Komplet')}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">{t('Gns. svartid')}</div>
              <div className="kpi-val">3.2 d</div>
              <div className="kpi-delta up"><I.TrendUp size={11}/> {t('-1.4 d siden Q1')}</div>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--c-line)' }}>
            {[
              { k: "active", l: "Aktive", n: counts.active },
              { k: "stuck", l: "Sidder fast", n: counts.stuck, warn: true },
              { k: "ready", l: "Klar", n: counts.ready },
              { k: "draft", l: "Udkast", n: counts.draft },
              { k: "all", l: "Alle", n: counts.all },
            ].map(tab => (
              <button key={tab.k} onClick={() => setFilter(tab.k)}
                style={{
                  padding: '8px 14px', marginBottom: -1, border: 'none', background: 'transparent',
                  borderBottom: filter === tab.k ? '2px solid var(--c-ink)' : '2px solid transparent',
                  color: filter === tab.k ? 'var(--c-ink)' : 'var(--c-text-2)',
                  fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                {t(tab.l)} <span style={{ fontSize: 11, color: tab.warn ? 'var(--c-warn)' : 'var(--c-text-3)', fontWeight: 600 }}>{tab.n}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 14 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              {filtered.map((r, i) => (
                <DataRequestRow key={r.id} r={r} isFirst={i === 0} selected={selected?.id === r.id} onSelect={() => setSelected(selected?.id === r.id ? null : r)} go={go}/>
              ))}
            </div>
            {selected && <DataRequestDetail r={selected} onClose={() => setSelected(null)} go={go}/>}
          </div>

          {/* Bulk actions hint */}
          <div className="cta" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <I.Send size={16} style={{ color: 'var(--c-text-3)' }}/>
            <div style={{ flex: 1, fontSize: 13 }}>
              <b>{t('2 kunder sidder fast')}</b> {t('i indleveringen. Send en samlet venlig påmindelse?')}
            </div>
            <button className="btn btn-sm">{t('Skriv besked')}</button>
            <button className="btn btn-sm btn-primary">{t('Send påmindelse til 2')}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function DataRequestRow({ r, isFirst, selected, onSelect, go }) {
  return (
    <div onClick={onSelect}
      style={{
        padding: '14px 18px',
        borderTop: !isFirst ? '1px solid var(--c-line-2)' : 'none',
        background: selected ? 'var(--c-surface-2)' : 'transparent',
        cursor: 'pointer',
        display: 'grid', gridTemplateColumns: '32px 1.4fr 1.6fr 200px 130px 36px', gap: 14, alignItems: 'center',
      }}>
      <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--c-text-2)' }}>
        {r.company.split(' ').slice(0, 2).map(w => w[0]).join('')}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)', display: 'flex', alignItems: 'center', gap: 7 }}>
          {r.company}
          {r.followup && <span className="tag" style={{ fontSize: 9.5, background: 'var(--c-warn-bg)', color: 'var(--c-warn)', border: 'none' }}>{t('1 spørgsmål åbent')}</span>}
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
          {r.contact !== "-" ? <>{r.contact} · {t(r.role)}</> : t('Ingen modtager valgt')}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, maxWidth: 180 }}>
            <div className="bar" style={{ height: 5 }}>
              <span style={{ width: r.progress + '%', background: r.status === 'ready' ? 'var(--c-success)' : r.status === 'stuck' ? 'var(--c-warn)' : 'var(--c-ink)' }}/>
            </div>
          </div>
          <span className="mono num" style={{ fontSize: 12, fontWeight: 500, minWidth: 56, textAlign: 'right' }}>{r.items.received}/{r.items.total} · {r.progress}%</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 11.5, color: r.status === 'stuck' ? 'var(--c-warn)' : 'var(--c-text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {r.status === 'stuck' && <I.AlertCircle size={10}/>}
          {r.status === 'ready' && <I.CheckCircle size={10} style={{ color: 'var(--c-success)' }}/>}
          {t(r.lastAction)}
        </div>
      </div>
      <div style={{ fontSize: 12.5 }}>
        <div className="label-mini" style={{ fontSize: 10 }}>{t('Deadline')}</div>
        <div style={{ fontWeight: 500, marginTop: 2, color: r.deadline === "-" ? 'var(--c-text-4)' : 'var(--c-text)' }}>{t(r.deadline)}</div>
        <div className="muted" style={{ fontSize: 11 }}>{t(r.lastActivity)}</div>
      </div>
      <div>
        {r.status === 'active' && <button onClick={(e) => { e.stopPropagation(); }} className="btn btn-sm" style={{ width: '100%', justifyContent: 'center' }}><I.Send className="ic"/> {t('Påmind')}</button>}
        {r.status === 'stuck' && <button onClick={(e) => { e.stopPropagation(); }} className="btn btn-sm btn-primary" style={{ width: '100%', justifyContent: 'center' }}><I.Send className="ic"/> {t('Påmind')}</button>}
        {r.status === 'ready' && <button onClick={(e) => { e.stopPropagation(); go && go("workspace:1"); }} className="btn btn-sm" style={{ width: '100%', justifyContent: 'center' }}>{t('Åbn sag')}</button>}
        {r.status === 'draft' && <button onClick={(e) => { e.stopPropagation(); }} className="btn btn-sm" style={{ width: '100%', justifyContent: 'center' }}>{t('Færdig­gør')}</button>}
      </div>
      <I.ChevronRight size={14} style={{ color: 'var(--c-text-3)', transform: selected ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}/>
    </div>
  );
}

function DataRequestDetail({ r, onClose, go }) {
  return (
    <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
      <div className="card-head">
        <div>
          <div className="card-title">{r.company}</div>
          <div className="card-sub">{t('Anmodning')} #{1000 + r.id}</div>
        </div>
        <button className="icon-btn" onClick={onClose}><I.X size={14}/></button>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {/* Progress big */}
        <div style={{ background: 'var(--c-surface-2)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.02em' }} className="mono num">{r.progress}%</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-2)' }}>{r.items.received} {t('af')} {r.items.total} {t('elementer')}</div>
          </div>
          <div className="bar" style={{ marginTop: 8 }}><span style={{ width: r.progress + '%' }}/></div>
        </div>

        {/* Contact */}
        <div className="label-mini" style={{ marginBottom: 6 }}>{t('Modtager')}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{r.contact !== "-" ? r.contact.split(' ').map(w => w[0]).join('') : "-"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{r.contact}</div>
            <div className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</div>
          </div>
          <button className="icon-btn"><I.Mail size={13}/></button>
        </div>

        {/* Activity timeline */}
        <div className="label-mini" style={{ marginBottom: 8 }}>{t('Aktivitet')}</div>
        <div style={{ position: 'relative', paddingLeft: 12 }}>
          <div style={{ position: 'absolute', left: 3, top: 6, bottom: 6, width: 1, background: 'var(--c-line)' }}/>
          {[
            { t: r.lastAction, d: r.lastActivity, dot: r.status === 'stuck' ? 'var(--c-warn)' : 'var(--c-ink)' },
            { t: "Åbnet af modtager", d: "23. maj · 08:54", dot: 'var(--c-success)' },
            { t: "Link sendt", d: r.sent || "-", dot: 'var(--c-text-3)' },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 12, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -12, top: 4, width: 7, height: 7, borderRadius: '50%', background: a.dot, border: '2px solid #fff', boxShadow: '0 0 0 1px ' + a.dot }}/>
              <div style={{ paddingLeft: 10, flex: 1 }}>
                <div style={{ fontSize: 12.5 }}>{t(a.t)}</div>
                <div className="muted" style={{ fontSize: 11 }}>{t(a.d)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--c-line-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><I.Send className="ic"/> {t('Send påmindelse')}</button>
          <button className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><I.Plus className="ic"/> {t('Anmod om mere materiale')}</button>
          <button className="btn btn-sm" style={{ justifyContent: 'flex-start' }}><I.Eye className="ic"/> {t('Se hvad kunden ser')}</button>
          <button className="btn btn-sm" onClick={() => go && go("workspace:1")} style={{ justifyContent: 'flex-start' }}><I.Briefcase className="ic"/> {t('Åbn sag')}</button>
          <button className="btn btn-sm btn-danger" style={{ justifyContent: 'flex-start' }}><I.X className="ic"/> {t('Luk anmodning')}</button>
        </div>
      </div>
    </div>
  );
}

window.DataRequests = DataRequests;
