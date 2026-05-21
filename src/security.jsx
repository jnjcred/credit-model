// Sikkerheder & kautioner
function WSSecurity() {
  const [filter, setFilter] = React.useState("all");
  const [showAddPant, setShowAddPant] = React.useState(false);

  const [securities, setSecurities] = React.useState([
    { id: 1, type: "Virksomhedspant", asset: "Driftsmateriel og maskiner", value: 2.8, currency: "DKK M", doc: "Pantebrev_maskiner.pdf", priority: "1.", status: "tinglyst", valued: "EY · 12. mar 2026", note: null },
    { id: 2, type: "Pant i fast ejendom", asset: "Havnegade 47, Frederikshavn", value: 1.8, currency: "DKK M", doc: "Tinglyst_pantebrev_Havnegade.pdf", priority: "1.", status: "tinglyst", valued: "EDC Erhverv · 2025", note: null },
    { id: 3, type: "Debitorpant", asset: "Tilgodehavende fra Vestas, GE", value: 1.2, currency: "DKK M", doc: "Debitorpant_aftale.pdf", priority: "1.", status: "tinglyst", valued: "Bog­ført værdi", note: null },
    { id: 4, type: "Pant i varelager", asset: "Råvarer (kulfiber, epoxy)", value: 0.4, currency: "DKK M", doc: "Pantebrev_varelager.pdf", priority: "2.", status: "tinglyst", valued: "Bog­ført værdi", note: "Sekundær prioritet efter Nordea" },
    { id: 5, type: "Pant i IP / patenter", asset: "Patent EP3214876 + know-how", value: null, currency: "—", doc: null, priority: "—", status: "ikke-tinglyst", valued: "Ikke vurderet", note: "Forsøgt vurderet — ingen markedsdata" },
  ]);

  const addSecurity = (s) => setSecurities(prev => [...prev, { ...s, id: prev.length + 1 }]);

  const guarantees = [
    { id: 1, type: "Personlig kaution", from: "Anders Christensen", role: "Stifter / CEO", amount: 0.5, scope: "Solidarisk · op til beløb", doc: "Personlig_kaution_AC.pdf", status: "signed", limit: "Maks 0,5M", note: null },
    { id: 2, type: "Selskabskaution", from: "Anders Holding ApS", role: "48,2% ejer", amount: 1.0, scope: "Solidarisk · op til beløb", doc: "Selskabskaution_AH.pdf", status: "signed", limit: "Maks 1,0M", note: null },
    { id: 3, type: "EIFO-garanti (intern)", from: "EIFO Eksportkaution", role: "Modregnes mod kreditrisiko", amount: 3.2, scope: "70% af eksport-tilgodehavender", doc: null, status: "draft", limit: "70% dækning", note: "Ramme­garanti for Block-Island leverance" },
    { id: 4, type: "Tilbagetrædelses­erklæring", from: "Anders Holding ApS", role: "Anpartshaver­lån 0,5M", amount: 0.5, scope: "Efterstillet alle øvrige kreditorer", doc: null, status: "missing", limit: "—", note: "AI fandt: dokument mangler i sagen" },
  ];

  const totalCredit = 4.5;
  const totalSecurityValue = securities.reduce((s, x) => s + (x.value || 0), 0);
  const totalGuaranteed = guarantees.filter(g => g.status === 'signed').reduce((s, x) => s + x.amount, 0);
  const coverage = ((totalSecurityValue + totalGuaranteed) / totalCredit * 100).toFixed(0);

  return (
    <div className="page page-wide" style={{ maxWidth: 1280 }}>
      {/* Header KPIs */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-lbl">Kreditbeløb</div>
          <div className="kpi-val mono">4,5M</div>
          <div className="kpi-delta flat">Eksport + drift</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Pant­sikkerheder</div>
          <div className="kpi-val mono">{totalSecurityValue.toFixed(1)}M</div>
          <div className="kpi-delta flat">{securities.length} stk · 4 tinglyste</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Kautioner</div>
          <div className="kpi-val mono">{totalGuaranteed.toFixed(1)}M</div>
          <div className="kpi-delta flat">2 personlige · 1 ramme</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Dækningsgrad</div>
          <div className="kpi-val mono">{coverage}%</div>
          <div className="kpi-delta up"><I.TrendUp size={12}/> Over tærskel (90%)</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Status</div>
          <div className="kpi-val" style={{ fontSize: 16, marginTop: 8 }}>
            <span className="pill warn" style={{ fontSize: 11.5 }}><span className="pill-dot"/>1 afklaring</span>
          </div>
          <div className="kpi-delta flat" style={{ marginTop: 5 }}>Tilbagetrædelses­erklæring</div>
        </div>
      </div>

      {/* Coverage visualizer */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Sikkerhedsmæssig dækning</div>
            <div className="card-sub">Forhold mellem kreditbeløb og sikkerheder + kautioner</div>
          </div>
          <button className="btn btn-sm btn-ghost">Forklar metode</button>
        </div>
        <div style={{ padding: '18px 22px' }}>
          <CoverageBar credit={totalCredit} security={totalSecurityValue} guarantee={totalGuaranteed}/>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--c-line)' }}>
        {[
          { k: "all", l: "Alle", n: securities.length + guarantees.length },
          { k: "sec", l: "Pantsikkerheder", n: securities.length },
          { k: "guar", l: "Kautioner", n: guarantees.length },
          { k: "issue", l: "Med afklaring", n: 2 },
        ].map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: '8px 12px', marginBottom: -1, border: 'none', background: 'transparent',
              borderBottom: filter === t.k ? '2px solid var(--c-ink)' : '2px solid transparent',
              color: filter === t.k ? 'var(--c-ink)' : 'var(--c-text-2)',
              fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
            {t.l} <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{t.n}</span>
          </button>
        ))}
      </div>

      {/* Securities table */}
      {(filter === "all" || filter === "sec") && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div className="card-title">Pantsikkerheder</div>
            <div className="hstack">
              <button className="btn btn-sm btn-ghost"><I.Sort className="ic"/> Sortér</button>
              <button className="btn btn-sm btn-primary" onClick={() => setShowAddPant(true)}><I.Plus className="ic"/> Tilføj pant</button>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Type / aktiv</th>
                <th>Prioritet</th>
                <th style={{ textAlign: 'right' }}>Værdi</th>
                <th>Vurderet</th>
                <th>Status</th>
                <th>Dokument</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {securities.map(s => (
                <tr key={s.id}>
                  <td><span style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--c-surface-2)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)' }}><I.Lock size={11}/></span></td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{s.type}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{s.asset}</div>
                    {s.note && <div style={{ fontSize: 11, color: 'var(--c-warn)', marginTop: 2 }}><I.AlertCircle size={10} style={{ verticalAlign: -1 }}/> {s.note}</div>}
                  </td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{s.priority}</td>
                  <td className="mono num" style={{ textAlign: 'right', fontWeight: 500, color: s.value === null ? 'var(--c-text-4)' : 'var(--c-ink)' }}>
                    {s.value === null ? '—' : `${s.value.toFixed(1)}M`}
                  </td>
                  <td><div style={{ fontSize: 12.5 }}>{s.valued}</div></td>
                  <td>
                    {s.status === 'tinglyst'
                      ? <span className="pill success" style={{ fontSize: 11 }}><span className="pill-dot"/>Tinglyst</span>
                      : <span className="pill warn" style={{ fontSize: 11 }}><span className="pill-dot"/>Ikke tinglyst</span>}
                  </td>
                  <td>
                    {s.doc ? <span className="source" style={{ cursor: 'pointer' }}><I.File className="ic"/> {s.doc}</span> : <span className="muted" style={{ fontSize: 11.5 }}>—</span>}
                  </td>
                  <td><button className="btn btn-sm btn-ghost"><I.MoreH className="ic"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Guarantees */}
      {(filter === "all" || filter === "guar" || filter === "issue") && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Kautioner og erklæringer</div>
            <button className="btn btn-sm"><I.Plus className="ic"/> Tilføj</button>
          </div>
          {guarantees.filter(g => filter !== 'issue' || g.status === 'missing' || g.status === 'draft').map((g, i) => (
            <div key={g.id} style={{ padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none', display: 'grid', gridTemplateColumns: '36px 1fr auto auto auto auto', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: g.type.includes('Personlig') ? 'var(--c-surface-2)' : '#fff', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)' }}>
                {g.type.includes('Personlig') ? <I.User size={14}/> : g.type.includes('Selskab') ? <I.Building size={14}/> : g.type.includes('Tilbage') ? <I.AlertTriangle size={14}/> : <I.Bookmark size={14}/>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{g.type}</div>
                <div className="muted" style={{ fontSize: 12 }}>{g.from} <span style={{ color: 'var(--c-text-4)' }}>·</span> {g.role}</div>
                {g.note && <div style={{ fontSize: 11.5, marginTop: 4, color: g.status === 'missing' ? 'var(--c-danger)' : 'var(--c-text-2)' }}>
                  {g.status === 'missing' && <I.AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 4 }}/>}{g.note}
                </div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Omfang</div>
                <div style={{ fontSize: 12, color: 'var(--c-text-2)' }}>{g.scope}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono num" style={{ fontSize: 14, fontWeight: 600 }}>{g.amount.toFixed(1)}M</div>
                <div className="muted" style={{ fontSize: 11 }}>{g.limit}</div>
              </div>
              <div>
                {g.status === 'signed' && <span className="pill success" style={{ fontSize: 11 }}><span className="pill-dot"/>Underskrevet</span>}
                {g.status === 'draft' && <span className="pill outline" style={{ fontSize: 11 }}><span className="pill-dot"/>Udkast</span>}
                {g.status === 'missing' && <span className="pill danger" style={{ fontSize: 11 }}><span className="pill-dot"/>Mangler</span>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {g.doc && <button className="btn btn-sm btn-ghost"><I.Eye className="ic"/></button>}
                {g.status === 'missing' && <button className="btn btn-sm">Anmod</button>}
                <button className="btn btn-sm btn-ghost"><I.MoreH className="ic"/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI panel */}
      <div className="card" style={{ marginTop: 16, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--c-warn-bg)', borderColor: 'transparent' }}>
        <I.AlertTriangle size={16} style={{ color: 'var(--c-warn)', marginTop: 2 }}/>
        <div style={{ flex: 1, fontSize: 13 }}>
          <div style={{ fontWeight: 500, color: 'var(--c-warn)' }}>Pantebrev refererer til "sædvanlige sikkerheder" uden specifikation</div>
          <div style={{ color: 'var(--c-text-2)', marginTop: 3, fontSize: 12.5 }}>I Pantebrev_maskiner.pdf §4 nævnes "sædvanlige sikkerheder for tilsvarende kreditforhold". For at undgå senere fortolknings­tvist bør konkrete aktiver listes.</div>
          <div style={{ marginTop: 8 }}><span className="source"><I.File className="ic"/> Pantebrev_maskiner.pdf · §4</span></div>
        </div>
        <button className="btn btn-sm">Tilføj til spørgsmål</button>
      </div>

      {showAddPant && <AddPantModal onClose={() => setShowAddPant(false)} onSave={(s) => { addSecurity(s); setShowAddPant(false); }}/>}
    </div>
  );
}

function CoverageBar({ credit, security, guarantee }) {
  const total = security + guarantee;
  const max = Math.max(total, credit) * 1.05;
  const secW = security / max * 100;
  const guarW = guarantee / max * 100;
  const creditX = credit / max * 100;

  return (
    <div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 12, fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--c-ink)' }}/> Pantsikkerheder <b className="mono num" style={{ marginLeft: 4 }}>{security.toFixed(1)}M</b></span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--c-text-2)' }}/> Kautioner <b className="mono num" style={{ marginLeft: 4 }}>{guarantee.toFixed(1)}M</b></span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}><span style={{ width: 12, height: 2, background: 'var(--c-danger)' }}/> Kreditbeløb <b className="mono num" style={{ marginLeft: 4 }}>{credit.toFixed(1)}M</b></span>
      </div>
      <div style={{ position: 'relative', height: 28, background: 'var(--c-line-2)', borderRadius: 6, overflow: 'visible' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: secW + '%', background: 'var(--c-ink)', borderRadius: '6px 0 0 6px' }}/>
        <div style={{ position: 'absolute', left: secW + '%', top: 0, height: '100%', width: guarW + '%', background: 'var(--c-text-2)', opacity: 0.7 }}/>
        <div style={{ position: 'absolute', left: creditX + '%', top: -4, bottom: -4, width: 2, background: 'var(--c-danger)', borderRadius: 1 }}>
          <div style={{ position: 'absolute', left: 6, top: -2, fontSize: 11, fontWeight: 500, color: 'var(--c-danger)', whiteSpace: 'nowrap' }}>Kredit {credit.toFixed(0)}M</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: 'var(--c-text-3)' }}>
        <span>0M</span>
        <span>Samlet sikkerhedsværdi: <b className="mono num" style={{ color: 'var(--c-ink)' }}>{total.toFixed(1)}M</b> · dækning {(total/credit*100).toFixed(0)}%</span>
        <span className="mono">{Math.ceil(max)}M</span>
      </div>
    </div>
  );
}

function AddPantModal({ onClose, onSave }) {
  const PANT_TYPES = [
    { k: "Virksomhedspant", desc: "Pant i alle aktiver i virksomheden", ic: <I.Boxes size={16}/> },
    { k: "Pant i fast ejendom", desc: "Tinglyst pant i specifik ejendom", ic: <I.Building size={16}/> },
    { k: "Pant i varelager", desc: "Pant i råvarer, færdigvarer eller komponenter", ic: <I.Database size={16}/> },
    { k: "Debitorpant", desc: "Pant i tilgodehavender fra navngivne kunder", ic: <I.Users size={16}/> },
    { k: "Pant i specifikke aktiver", desc: "Maskiner, køretøjer, udstyr — afgrænset", ic: <I.Lock size={16}/> },
    { k: "Pant i IP / patenter", desc: "Patenter, varemærker, know-how", ic: <I.Star size={16}/> },
    { k: "Andet", desc: "Brugerdefineret type", ic: <I.Plus size={16}/> },
  ];

  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({
    type: "",
    asset: "",
    value: "",
    priority: "1.",
    status: "ikke-tinglyst",
    valued: "Bog­ført værdi",
    doc: null,
    note: "",
  });

  const canNext = step === 1 ? !!form.type : step === 2 ? !!form.asset && !!form.value : true;

  const submit = () => {
    onSave({
      type: form.type,
      asset: form.asset,
      value: parseFloat(form.value.replace(',', '.').replace('M', '')) || null,
      currency: "DKK M",
      priority: form.priority,
      status: form.status,
      valued: form.valued,
      doc: form.doc,
      note: form.note || null,
    });
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" style={{ width: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Tilføj pant­sikkerhed</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Trin {step} af 3</div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.X size={16}/></button>
        </div>

        <div style={{ padding: '0 22px', borderBottom: '1px solid var(--c-line)' }}>
          <div style={{ display: 'flex' }}>
            {[
              { n: 1, t: "Type" },
              { n: 2, t: "Aktiv og værdi" },
              { n: 3, t: "Dokument og status" },
            ].map(s => (
              <div key={s.n} style={{ flex: 1, padding: '12px 0', borderBottom: '2px solid ' + (step === s.n ? 'var(--c-primary)' : 'transparent'), color: step >= s.n ? 'var(--c-primary)' : 'var(--c-text-3)', fontSize: 12.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: step >= s.n ? 'var(--c-primary)' : 'var(--c-line-2)', color: '#fff', fontSize: 10.5, display: 'grid', placeItems: 'center', fontWeight: 600 }}>{s.n}</span>
                {s.t}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: 480 }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginBottom: 12 }}>Vælg hvilken slags pant du vil tilføje. Du kan ændre senere.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PANT_TYPES.map(p => (
                  <button key={p.k} onClick={() => setForm({...form, type: p.k})}
                    style={{
                      padding: '12px 14px', border: '1px solid ' + (form.type === p.k ? 'var(--c-primary)' : 'var(--c-line)'),
                      borderRadius: 8, background: form.type === p.k ? 'var(--c-primary-bg)' : '#fff',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--c-surface-2)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)', flexShrink: 0 }}>{p.ic}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)' }}>{p.k}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                    </div>
                    {form.type === p.k && <I.Check size={14} style={{ color: 'var(--c-primary)', flexShrink: 0 }}/>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="vstack" style={{ gap: 14 }}>
              <div className="field">
                <label>Aktiv eller beskrivelse</label>
                <input className="input input-lg" autoFocus value={form.asset} onChange={e => setForm({...form, asset: e.target.value})}
                  placeholder={form.type === "Pant i fast ejendom" ? "F.eks. Havnegade 47, Frederikshavn" : form.type === "Debitorpant" ? "Tilgodehavende fra navngivne kunder" : "Beskriv aktivet"}/>
              </div>
              <div className="grid g-2" style={{ gap: 14 }}>
                <div className="field">
                  <label>Vurderet værdi (DKK M)</label>
                  <input className="input input-lg mono" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="0,0"/>
                </div>
                <div className="field">
                  <label>Prioritet</label>
                  <select className="input input-lg" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="1.">1. prioritet</option>
                    <option value="2.">2. prioritet</option>
                    <option value="3.">3. prioritet</option>
                    <option value="—">Ikke relevant</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Vurderingsgrundlag</label>
                <select className="input" value={form.valued} onChange={e => setForm({...form, valued: e.target.value})}>
                  <option>Bog­ført værdi</option>
                  <option>Ekstern vurdering (EY, Deloitte)</option>
                  <option>Ekstern vurdering (EDC Erhverv)</option>
                  <option>Mæglervurdering</option>
                  <option>Markedsvurdering</option>
                  <option>Ikke vurderet</option>
                </select>
              </div>
              <div className="field">
                <label>Note (valgfri)</label>
                <input className="input" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="F.eks. 'Sekundær prioritet efter Nordea'"/>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="vstack" style={{ gap: 14 }}>
              <div className="field">
                <label>Tinglysnings­status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { v: "tinglyst", l: "Tinglyst", d: "Pantet er registreret i tingbogen" },
                    { v: "ikke-tinglyst", l: "Ikke tinglyst", d: "Pant er aftalt, men ikke registreret" },
                    { v: "afventer", l: "Afventer tinglysning", d: "Anmeldt, ikke afsluttet" },
                  ].map(o => (
                    <button key={o.v} onClick={() => setForm({...form, status: o.v})}
                      style={{
                        flex: 1, padding: '10px 12px', textAlign: 'left',
                        border: '1px solid ' + (form.status === o.v ? 'var(--c-primary)' : 'var(--c-line)'),
                        borderRadius: 8, background: form.status === o.v ? 'var(--c-primary-bg)' : '#fff', cursor: 'pointer',
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{o.l}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.4 }}>{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Underliggende dokument</label>
                <div onClick={() => setForm({...form, doc: form.doc ? null : "Pantebrev_nyt.pdf"})}
                  style={{
                    border: '1.5px dashed ' + (form.doc ? 'var(--c-primary)' : 'var(--c-line-strong)'),
                    background: form.doc ? 'var(--c-primary-bg)' : 'var(--c-surface-2)',
                    borderRadius: 8, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  }}>
                  {form.doc ? <I.FileText size={16} style={{ color: 'var(--c-primary)' }}/> : <I.Upload size={16} style={{ color: 'var(--c-text-3)' }}/>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{form.doc || "Træk PDF ind eller klik for at vælge"}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2 }}>
                      {form.doc ? "AI vil aflæse §-numre og parter automatisk" : "Pantebrev, tinglysningsattest eller anden dokumentation"}
                    </div>
                  </div>
                  {form.doc && <I.X size={14} style={{ color: 'var(--c-text-3)' }}/>}
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--c-surface-2)', borderRadius: 8, fontSize: 12.5 }}>
                <div className="label-mini" style={{ marginBottom: 6 }}>Sammendrag</div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px 12px' }}>
                  <div className="muted">Type</div><div>{form.type || "—"}</div>
                  <div className="muted">Aktiv</div><div>{form.asset || "—"}</div>
                  <div className="muted">Værdi</div><div className="mono">{form.value ? form.value + " M DKK" : "—"} · {form.priority} prioritet</div>
                  <div className="muted">Status</div><div>{form.status}</div>
                  <div className="muted">Dokument</div><div>{form.doc || "Mangler — tilføj senere"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {step > 1 && <button className="btn" onClick={() => setStep(step - 1)}><I.ChevronLeft className="ic"/> Tilbage</button>}
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost" onClick={onClose}>Annullér</button>
          {step < 3
            ? <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)} style={!canNext ? { opacity: 0.5, cursor: 'not-allowed' } : null}>Næste <I.ArrowRight className="ic"/></button>
            : <button className="btn btn-primary" onClick={submit}><I.Check className="ic"/> Tilføj pant</button>}
        </div>
      </div>
    </div>
  );
}

window.WSSecurity = WSSecurity;
