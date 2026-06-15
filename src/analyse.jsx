// Portfolio screening / analyse side

const ANALYSE_CASES = [
  { id: 1,  cvr: "12345678", name: "Nordhavn Composite ApS",      dept: "Frederikshavn Erhverv", branche: "Industri",             rev12: 18500000,  revPct: 32,  ebitda12: 2400000,  ebitdaPct: 13,  equity: 6200000,  bigCust: 41 },
  { id: 2,  cvr: "12345678", name: "Vendia Bio ApS",              dept: "Esbjerg Erhverv",        branche: "Medicinal og biotek",  rev12: 9200000,   revPct: 28,  ebitda12: 1100000,  ebitdaPct: 12,  equity: 3100000,  bigCust: 22 },
  { id: 3,  cvr: "12345678", name: "Marstal Maritime ApS",        dept: "Svendborg Erhverv",      branche: "Transport og logistik",rev12: 42100000,  revPct: -8,  ebitda12: -2400000, ebitdaPct: -6,  equity: 11400000, bigCust: 58 },
  { id: 4,  cvr: "12345678", name: "Skagen Klima ApS",            dept: "Skagen Erhverv",         branche: "Energi og forsyning",  rev12: 5800000,   revPct: 27,  ebitda12: 800000,   ebitdaPct: 14,  equity: 1900000,  bigCust: 33 },
  { id: 5,  cvr: "12345678", name: "Lyngbæk Industrier ApS",      dept: "Herning Erhverv",        branche: "Industri",             rev12: 28400000,  revPct: -12, ebitda12: -4100000, ebitdaPct: -14, equity: -1200000, bigCust: 71 },
  { id: 6,  cvr: "12345678", name: "Aalborg Hydrogen A/S",        dept: "Aalborg Erhverv",        branche: "Energi og forsyning",  rev12: 61300000,  revPct: 45,  ebitda12: 9200000,  ebitdaPct: 15,  equity: 24100000, bigCust: 18 },
  { id: 7,  cvr: "12345678", name: "Kløver Tekstil ApS",          dept: "Ikast Erhverv",          branche: "Tekstil og beklædning",rev12: 11000000,  revPct: 4,   ebitda12: 900000,   ebitdaPct: 8,   equity: 3800000,  bigCust: 29 },
  { id: 8,  cvr: "12345678", name: "Refshaleøen Robotics ApS",    dept: "København Erhverv",      branche: "IT og teknologi",      rev12: 14700000,  revPct: 38,  ebitda12: 2100000,  ebitdaPct: 14,  equity: 5500000,  bigCust: 44 },
  { id: 9,  cvr: "12345678", name: "Skov & Bertelsen Tømrer ApS", dept: "Odense Erhverv",         branche: "Bygge og anlæg",       rev12: 8700000,   revPct: 12,  ebitda12: 680000,   ebitdaPct: 8,   equity: 2100000,  bigCust: 38 },
  { id: 10, cvr: "12345678", name: "Jutland Gulve & Fliser ApS",  dept: "Vejle Erhverv",          branche: "Bygge og anlæg",       rev12: 5200000,   revPct: 6,   ebitda12: 420000,   ebitdaPct: 8,   equity: 980000,   bigCust: 55 },
  { id: 11, cvr: "12345678", name: "Morsø Slagter & Deli ApS",   dept: "Thisted Erhverv",        branche: "Fødevarer og drikke",  rev12: 6400000,   revPct: 3,   ebitda12: 310000,   ebitdaPct: 5,   equity: 1450000,  bigCust: 31 },
  { id: 12, cvr: "12345678", name: "Ballerup Autoservice A/S",    dept: "København Erhverv",      branche: "Handel og service",    rev12: 12800000,  revPct: -5,  ebitda12: -180000,  ebitdaPct: -1,  equity: 2700000,  bigCust: 19 },
  { id: 13, cvr: "12345678", name: "BrainSpark Technologies A/S", dept: "Aarhus Erhverv",         branche: "IT og teknologi",      rev12: 32400000,  revPct: 48,  ebitda12: 6100000,  ebitdaPct: 19,  equity: 18700000, bigCust: 12 },
  { id: 14, cvr: "12345678", name: "Midtjylland Vindservice ApS", dept: "Herning Erhverv",        branche: "Energi og forsyning",  rev12: 54200000,  revPct: 41,  ebitda12: 11300000, ebitdaPct: 21,  equity: 29400000, bigCust: 8  },
];

const TEMPLATES = [
  {
    group: "god", label: "Høj vækst", emoji: "📈",
    desc: "Høj omsætnings- og EBITDA-vækst",
    criteria: [
      { metric: "revPct",    op: ">", val: 25, joinNext: "AND" },
      { metric: "ebitdaPct", op: ">", val: 10 },
    ]
  },
  {
    group: "god", label: "Sund drift", emoji: "💰",
    desc: "Positiv EBITDA og positiv egenkapital",
    criteria: [
      { metric: "ebitda12", op: ">", val: 500000, joinNext: "AND" },
      { metric: "equity",   op: ">", val: 0 },
    ]
  },
  {
    group: "god", label: "Topperformere", emoji: "⭐",
    desc: "Høj vækst og sund økonomi på alle fronter",
    criteria: [
      { metric: "revPct",    op: ">", val: 30, joinNext: "AND" },
      { metric: "ebitdaPct", op: ">", val: 15, joinNext: "AND" },
      { metric: "equity",    op: ">", val: 0  },
    ]
  },
  {
    group: "fare", label: "EBITDA-tilbagegang", emoji: "📉",
    desc: "Faldende EBITDA ift. forrige 12 måneder",
    criteria: [{ metric: "ebitdaPct", op: "<", val: -10 }]
  },
  {
    group: "fare", label: "Negativ egenkapital", emoji: "⚠️",
    desc: "Egenkapital under nul - mulig solvensmæssig risiko",
    criteria: [{ metric: "equity", op: "<", val: 0 }]
  },
  {
    group: "fare", label: "Kundekoncentration", emoji: "👥",
    desc: "Mere end halvdelen af omsætning hos én kunde",
    criteria: [{ metric: "bigCust", op: ">", val: 50 }]
  },
  {
    group: "fare", label: "Faldende omsætning",
    criteria: [{ metric: "revPct", op: "<", val: -5 }]
  },
  {
    group: "fare", label: "Dobbelt underskud",
    criteria: [
      { metric: "ebitdaPct", op: "<", val: -10, joinNext: "AND" },
      { metric: "equity",    op: "<", val: 0 },
    ]
  },
  {
    group: "fare", label: "Koncentration og fald",
    criteria: [
      { metric: "bigCust",   op: ">", val: 50,  joinNext: "AND" },
      { metric: "ebitdaPct", op: "<", val: -10 },
    ]
  },
];

const METRICS = [
  { k: "revPct",    l: "Ændring i omsætning (%)",  short: "Omsætning",     unit: "%",   amtField: "rev12",    amtLabel: "Minimum omsætning" },
  { k: "ebitdaPct", l: "Ændring i EBITDA (%)",      short: "EBITDA",        unit: "%",   amtField: "ebitda12", amtLabel: "Minimum EBITDA"    },
  { k: "rev12",     l: "Omsætning 12 mdr.",          short: "Omsætning",     unit: "kr.", amtField: null },
  { k: "ebitda12",  l: "EBITDA 12 mdr.",             short: "EBITDA",        unit: "kr.", amtField: null },
  { k: "equity",    l: "Egenkapital",                short: "Egenkapital",   unit: "kr.", amtField: null },
  { k: "bigCust",   l: "Største kundeandel (%)",     short: "Kundeandel",    unit: "%",   amtField: null },
];

function metaFor(k) { return METRICS.find(m => m.k === k) || METRICS[0]; }

let _uid = 1;
function uid() { return _uid++; }

function makeCrit(metric) {
  const m = metaFor(metric);
  return { id: uid(), metric, op: ">", val: 0, unit: m.unit, minAmt: "", minAmtOp: ">", joinNext: "AND" };
}

function matchesCrit(row, c) {
  const v = Number(c.val);
  if (isNaN(v)) return true;
  const mainOk = c.op === ">" ? row[c.metric] > v : row[c.metric] < v;
  if (!mainOk) return false;
  const m = metaFor(c.metric);
  if (m.amtField && c.minAmt !== "" && c.minAmt !== null) {
    const amt = Number(c.minAmt);
    if (!isNaN(amt)) {
      const amtOk = c.minAmtOp === ">" ? row[m.amtField] > amt : row[m.amtField] < amt;
      if (!amtOk) return false;
    }
  }
  return true;
}

function runQuery(dept, branche, criteria) {
  let base = ANALYSE_CASES;
  if (dept !== "alle") base = base.filter(r => r.dept === dept);
  if (branche !== "alle") base = base.filter(r => r.branche === branche);
  if (criteria.length === 0) return base;

  let ids = new Set(base.filter(r => matchesCrit(r, criteria[0])).map(r => r.id));
  for (let i = 0; i < criteria.length - 1; i++) {
    const logic = criteria[i].joinNext;
    const next = criteria[i + 1];
    const nextIds = new Set(base.filter(r => matchesCrit(r, next)).map(r => r.id));
    if (logic === "AND") {
      ids = new Set([...ids].filter(id => nextIds.has(id)));
    } else {
      nextIds.forEach(id => ids.add(id));
    }
  }
  return base.filter(r => ids.has(r.id));
}

function pct(v) {
  const color = v > 0 ? "var(--c-success)" : v < 0 ? "var(--c-danger)" : "var(--c-text-2)";
  return <span style={{ color, fontWeight: 500 }}>{v > 0 ? "+" : ""}{v}%</span>;
}
function fmt(v) { return v.toLocaleString("da-DK", { maximumFractionDigits: 0 }); }

// ----- Criterion row -----
function CriteriaRow({ c, onChange, onRemove, canRemove, showLabels }) {
  const meta = metaFor(c.metric);
  const S = {
    height: 40, border: "1px solid var(--c-line-strong)",
    fontSize: 12, background: "#fff", color: "var(--c-ink)", outline: "none",
  };
  const Lbl = ({ children }) => showLabels
    ? <div className="field-label">{children}</div>
    : null;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 10 }}>
      <div style={{ flex: "0 0 216px" }}>
        <Lbl>Kriterie</Lbl>
        <select value={c.metric} onChange={e => {
          const m = metaFor(e.target.value);
          onChange({ ...c, metric: e.target.value, unit: m.unit, minAmt: "" });
        }} style={{ ...S, borderRadius: 6, padding: "0 10px", width: "100%", cursor: "pointer" }}>
          {METRICS.map(m => <option key={m.k} value={m.k}>{m.l}</option>)}
        </select>
      </div>

      <div>
        <Lbl>Ændring</Lbl>
        <div style={{ display: "flex" }}>
          <select value={c.op} onChange={e => onChange({ ...c, op: e.target.value })}
            style={{ ...S, padding: "0 6px", borderRadius: "6px 0 0 6px", borderRight: "none", width: 42, cursor: "pointer", textAlign: "center" }}>
            <option value=">">{">"}</option>
            <option value="<">{"<"}</option>
          </select>
          <input type="number" value={c.val} onChange={e => onChange({ ...c, val: e.target.value })}
            style={{ ...S, borderRadius: 0, width: 110, textAlign: "right", padding: "0 8px", fontFamily: "var(--mono)" }}/>
          <div style={{ ...S, borderRadius: "0 6px 6px 0", borderLeft: "none", padding: "0 10px",
            background: "var(--c-surface-2)", color: "var(--c-text-2)", display: "flex", alignItems: "center", fontSize: 12 }}>
            {meta.unit}
          </div>
        </div>
      </div>

      {meta.amtField ? (
        <div>
          <Lbl>Minimum beløb</Lbl>
          <div style={{ display: "flex" }}>
            <select value={c.minAmtOp} onChange={e => onChange({ ...c, minAmtOp: e.target.value })}
              style={{ ...S, padding: "0 6px", borderRadius: "6px 0 0 6px", borderRight: "none", width: 42, cursor: "pointer" }}>
              <option value=">">{">"}</option>
              <option value="<">{"<"}</option>
            </select>
            <input type="number" value={c.minAmt} placeholder="valgfri"
              onChange={e => onChange({ ...c, minAmt: e.target.value })}
              style={{ ...S, borderRadius: 0, width: 130, textAlign: "right", padding: "0 8px", fontFamily: "var(--mono)" }}/>
            <div style={{ ...S, borderRadius: "0 6px 6px 0", borderLeft: "none", padding: "0 10px",
              background: "var(--c-surface-2)", color: "var(--c-text-2)", display: "flex", alignItems: "center", fontSize: 12 }}>
              kr.
            </div>
          </div>
        </div>
      ) : null}

      <button onClick={onRemove} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--c-danger)", fontSize: 12, fontWeight: 500,
        padding: "0 4px", alignSelf: "flex-end", height: 36, flexShrink: 0,
      }}>
        Fjern
      </button>
    </div>
  );
}

// ----- AND/OR toggle -----
function JoinToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--c-line-2)" }}/>
      <button onClick={() => onChange(value === "AND" ? "OR" : "AND")} style={{
        padding: "3px 14px", border: "1px solid var(--c-line-strong)", borderRadius: 99,
        background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 700,
        color: value === "AND" ? "var(--c-ink)" : "#c47b00",
        letterSpacing: "0.06em", userSelect: "none",
      }}>
        {value === "AND" ? "OG" : "ELLER"}
      </button>
      <div style={{ flex: 1, height: 1, background: "var(--c-line-2)" }}/>
    </div>
  );
}

// ----- Chip summary -----
function fmtVal(val, unit) {
  const n = Number(val);
  if (isNaN(n)) return val;
  return unit === "kr." ? n.toLocaleString("da-DK") : String(val);
}

function ChipSummary({ c, onRemove }) {
  const m = metaFor(c.metric);
  const parts = [`${m.l} ${c.op} ${fmtVal(c.val, m.unit)} ${m.unit}`];
  if (m.amtField && c.minAmt !== "") parts.push(`og ${c.minAmtOp} ${Number(c.minAmt).toLocaleString("da-DK")} kr.`);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "var(--c-surface-2)", border: "1px solid var(--c-line-strong)",
      borderRadius: 99, padding: "4px 6px 4px 12px", fontSize: 12.5, color: "var(--c-ink)",
      whiteSpace: "nowrap",
    }}>
      {parts.join(" ")}
      <button onClick={onRemove} style={{
        width: 18, height: 18, border: 0, borderRadius: 99, background: "var(--c-line)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-text-2)", flexShrink: 0,
      }}>
        <I.X size={9}/>
      </button>
    </span>
  );
}

function describeTemplateCriteria(crits) {
  const PCT_CHANGE = new Set(["revPct", "ebitdaPct"]);
  return crits.map((c, i) => {
    const m = metaFor(c.metric);
    const valStr = m.unit === "kr." ? Number(c.val).toLocaleString("da-DK") + " kr." : c.val + m.unit;
    let op;
    if (PCT_CHANGE.has(c.metric)) op = c.op === ">" ? "↑" : "↓";
    else op = c.op;
    const part = (m.short || m.l) + " " + op + " " + valStr;
    if (i < crits.length - 1) return part + (c.joinNext === "AND" ? " og " : " eller ");
    return part;
  }).join("");
}

// ----- Sortable header -----
function SortTh({ col, label, title, align, sortCol, sortDir, onSort, width }) {
  const active = sortCol === col;
  return (
    <th title={title} style={{ textAlign: align || "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", padding: "8px 10px", width }}
      onClick={() => onSort(col)}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {label}
        <span style={{ opacity: active ? 1 : 0.2, fontSize: 9 }}>
          {sortDir === "asc" && active ? "▲" : "▼"}
        </span>
      </span>
    </th>
  );
}

// ----- Template card -----
function TemplateCard({ t, active, onClick, grid }) {
  const [hover, setHover] = React.useState(false);
  const isGod = t.group === "god";
  const accentColor = isGod ? "#15803d" : "#b91c1c";
  const bg = active ? (isGod ? "#f0fdf4" : "#fef2f2") : hover ? "#f3f4f6" : "transparent";

  if (grid) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", flexDirection: "column", gap: 2,
          width: "100%", padding: "8px 10px",
          textAlign: "left", cursor: "pointer",
          border: "none",
          borderLeft: `2px solid ${active ? accentColor : "transparent"}`,
          background: bg, borderRadius: "0 4px 4px 0", transition: "background 0.1s",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{t.label}</div>
        <div style={{ fontSize: 10.5, color: "#6b7280", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.desc}</div>
        {active && <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>Valgt</span>}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 10px 8px 12px",
        textAlign: "left", cursor: "pointer",
        border: "none",
        borderLeft: `2px solid ${active ? accentColor : "transparent"}`,
        background: bg, borderRadius: "0 4px 4px 0", transition: "background 0.1s",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.desc}</div>
      </div>
      {active && <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>Valgt</span>}
    </button>
  );
}

// ----- Main component -----
function PortfolioAnalyse({ go }) {
  const [dept, setDept]           = React.useState("alle");
  const [branche, setBranche]     = React.useState("alle");
  const [criteria, setCriteria]   = React.useState([]);
  const [activeTemplate, setActiveTemplate] = React.useState(null);
  const [advOpen, setAdvOpen]     = React.useState(false);
  const [sortCol, setSortCol]     = React.useState("rev12");
  const [sortDir, setSortDir]     = React.useState("desc");
  const [results, setResults]     = React.useState(null);
  const [loading, setLoading]     = React.useState(false);
  const [selectedYear, setSelectedYear] = React.useState("2025");

  React.useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setResults(runQuery(dept, branche, criteria));
      setLoading(false);
    }, 350 + Math.random() * 250);
    return () => clearTimeout(t);
  }, [dept, branche, criteria]);

  const onSort = (col) => {
    setSortCol(col);
    setSortDir(prev => col === sortCol && prev === "desc" ? "asc" : "desc");
  };

  const sorted = React.useMemo(() => {
    if (!results) return [];
    return [...results].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = typeof av === "string" ? av.localeCompare(bv, "da") : (av ?? 0) - (bv ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [results, sortCol, sortDir]);

  const update  = (id, updated) => { setCriteria(prev => prev.map(c => c.id === id ? updated : c)); };
  const remove  = (id)          => { setCriteria(prev => prev.filter(c => c.id !== id)); };
  const add     = ()            => { setCriteria(prev => [...prev, makeCrit("revPct")]); };
  const setJoin = (id, val)     => { setCriteria(prev => prev.map(c => c.id === id ? { ...c, joinNext: val } : c)); };

  const reset = () => {
    setDept("alle"); setBranche("alle");
    setCriteria([]);
    setActiveTemplate(null);
  };

  const loadTemplate = (t) => {
    setCriteria(t.criteria.map(c => ({
      ...makeCrit(c.metric),
      op: c.op, val: c.val,
      joinNext: c.joinNext || "AND",
    })));
    setActiveTemplate(t.label);
  };

  const depts    = ["alle", ...new Set(ANALYSE_CASES.map(r => r.dept))];
  const branches = ["alle", ...new Set(ANALYSE_CASES.map(r => r.branche)).values()].sort((a,b) => a === "alle" ? -1 : a.localeCompare(b, "da"));

  const godTemplates  = TEMPLATES.filter(t => t.group === "god");
  const fareTemplates = TEMPLATES.filter(t => t.group === "fare");

  const selectStyle = {
    height: 34, padding: "0 10px", border: "1px solid var(--c-line-strong)",
    borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--c-ink)",
    minWidth: 200, cursor: "pointer",
  };

  return (
    <>
      <Topbar crumbs={["Porteføljeanalyse"]} right={null}/>

      <div className="scroll">
        <div className="page page-wide" style={{ maxWidth: 1360, padding: "20px 28px 80px" }}>

          <div style={{ marginBottom: 20 }}>
            <h1 className="page-title">Porteføljeanalyse</h1>
            <div className="page-sub">Find kunder på tværs af porteføljen ud fra finansielle kriterier</div>
          </div>

          {/* Filter panel */}
          <div className="card" style={{ marginBottom: 14, padding: 0 }}>

            {/* Templates */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E7EB", background: "#f9fafb" }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                Skabeloner
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                {/* Good group */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, paddingLeft: 12 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#15803d", flexShrink: 0 }}/>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", letterSpacing: "0.02em" }}>Klarer det godt</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {godTemplates.map(t => (
                      <TemplateCard
                        key={t.label}
                        t={{ ...t, desc: describeTemplateCriteria(t.criteria) }}
                        active={activeTemplate === t.label}
                        onClick={() => {
                          if (activeTemplate === t.label) { setActiveTemplate(null); setCriteria([]); }
                          else loadTemplate(t);
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Divider */}
                <div style={{ width: 1, background: "#E5E7EB", margin: "0 16px", flexShrink: 0 }}/>
                {/* Fare group */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, paddingLeft: 12 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#b91c1c", flexShrink: 0 }}/>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", letterSpacing: "0.02em" }}>Faresignaler</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    {fareTemplates.map(t => (
                      <TemplateCard
                        key={t.label}
                        t={{ ...t, desc: describeTemplateCriteria(t.criteria) }}
                        active={activeTemplate === t.label}
                        grid
                        onClick={() => {
                          if (activeTemplate === t.label) { setActiveTemplate(null); setCriteria([]); }
                          else loadTemplate(t);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dept + branche row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: "1px solid var(--c-line-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--c-text-2)", fontWeight: 500, flexShrink: 0 }}>Afdeling</span>
                <select value={dept} onChange={e => { setDept(e.target.value); setResults(null); }} style={selectStyle}>
                  <option value="alle">Alle afdelinger</option>
                  {depts.filter(d => d !== "alle").map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--c-text-2)", fontWeight: 500, flexShrink: 0 }}>Branche</span>
                <select value={branche} onChange={e => { setBranche(e.target.value); setResults(null); }} style={selectStyle}>
                  <option value="alle">Alle brancher</option>
                  {branches.filter(b => b !== "alle").map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }} onClick={reset}>
                <I.Refresh size={12}/> Nulstil alle valg
              </button>
            </div>

            {/* Avanceret søgning */}
            <div style={{ borderBottom: (activeTemplate && criteria.length > 0) ? "1px solid var(--c-line-2)" : "none" }}>
              <button
                onClick={() => setAdvOpen(o => !o)}
                style={{
                  width: "100%", padding: "11px 20px",
                  display: "flex", alignItems: "center", gap: 8,
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <I.ChevronRight size={13} style={{ color: "var(--c-text-3)", transition: "transform 0.15s", transform: advOpen ? "rotate(90deg)" : "none" }}/>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text-2)" }}>Avanceret søgning</span>
                {!activeTemplate && criteria.length > 0 && (
                  <span style={{ fontSize: 11, background: "var(--c-surface-2)", border: "1px solid var(--c-line-strong)", padding: "1px 6px", borderRadius: 99, fontWeight: 600, color: "var(--c-text-2)" }}>
                    {criteria.length}
                  </span>
                )}
              </button>
              {advOpen && (
                <div style={{ padding: "4px 20px 16px", borderTop: "1px solid var(--c-line-2)" }}>
                  {criteria.length === 0 && (
                    <div style={{ fontSize: 12.5, color: "var(--c-text-3)", margin: "8px 0 10px" }}>
                      Ingen aktive kriterier. Klik "Tilføj kriterie" for at filtrere manuelt.
                    </div>
                  )}
                  {criteria.map((c, i) => (
                    <React.Fragment key={c.id}>
                      <CriteriaRow
                        c={c}
                        onChange={updated => update(c.id, updated)}
                        onRemove={() => remove(c.id)}
                        canRemove={true}
                        showLabels={i === 0}
                      />
                      {i < criteria.length - 1 && (
                        <JoinToggle value={c.joinNext} onChange={val => setJoin(c.id, val)}/>
                      )}
                    </React.Fragment>
                  ))}
                  <div style={{ marginTop: criteria.length > 0 ? 10 : 0 }}>
                    <button className="btn btn-sm btn-ghost" onClick={add}>
                      <I.Plus size={12}/> Tilføj kriterie
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active template criteria display */}
            {activeTemplate && criteria.length > 0 && (
              <div style={{ padding: "12px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-2)" }}>Aktive kriterier</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    style={{ marginLeft: "auto", fontSize: 12 }}
                    onClick={() => { setActiveTemplate(null); setCriteria([]); }}
                  >
                    <I.X size={11}/> Fjern skabelon
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {criteria.map((c, i) => (
                    <React.Fragment key={c.id}>
                      <ChipSummary c={c} onRemove={() => criteria.length > 1 && remove(c.id)}/>
                      {i < criteria.length - 1 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.joinNext === "AND" ? "var(--c-text-3)" : "#c47b00", letterSpacing: "0.08em", padding: "0 2px" }}>
                          {c.joinNext === "AND" ? "OG" : "ELLER"}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <>
              <style>{`@keyframes cw-spin { to { transform: rotate(360deg); } }`}</style>
              <div className="card" style={{ marginTop: 4, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 22, height: 22, border: '2px solid var(--c-line)', borderTopColor: 'var(--c-accent)', borderRadius: '50%', animation: 'cw-spin 0.75s linear infinite' }}/>
                <div style={{ color: 'var(--c-text-2)', fontSize: 13 }}>Søger i porteføljen…</div>
              </div>
            </>
          ) : results === null || results.length === 0 ? (
            <div className="card empty" style={{ marginTop: 4 }}>
              <I.Search className="ic" style={{ width: 26, height: 26 }}/>
              <div>Ingen kunder matcher de valgte kriterier</div>
              <div style={{ fontSize: 11.5, marginTop: 4, color: "var(--c-text-3)" }}>Prøv at justere tærskelværdierne</div>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-ink)" }}>Dine kunder</span>
                  <span style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-line-strong)", padding: "1px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                    {results.length} kunder
                  </span>
                  {activeTemplate && (
                    <span style={{ fontSize: 12, color: "var(--c-text-2)", marginLeft: 4 }}>
                      · Skabelon: <b>{activeTemplate}</b>
                    </span>
                  )}
                </div>
              </div>
              {/* Periode-filter toolbar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--c-line-2)", background: "var(--c-surface-1)" }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--c-text-2)", flexShrink: 0 }}>Periode:</span>
                {["2023", "2024", "2025"].map(yr => {
                  const active = selectedYear === yr;
                  return (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      style={{
                        height: 30, padding: "0 12px", borderRadius: 999,
                        border: "1px solid " + (active ? "var(--c-accent)" : "var(--c-line-strong)"),
                        background: active ? "var(--c-accent)" : "#fff",
                        color: active ? "#fff" : "var(--c-ink)",
                        fontSize: 12.5, fontWeight: active ? 600 : 400,
                        cursor: "pointer", transition: "all 0.1s",
                      }}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
              <table className="tbl" style={{ tableLayout: "fixed", width: "100%", fontSize: 12 }}>
                <thead>
                  <tr>
                    <SortTh col="name"      label="Kundenavn"                         title="Virksomhedens navn"                                                         align="left"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="20%"/>
                    <SortTh col="dept"      label="Afdeling"                          title="Ansvarlig afdeling"                                                         align="left"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="10%"/>
                    <SortTh col="branche"   label="Branche"                           title="Branche / sektor"                                                           align="left"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="8%"/>
                    <SortTh col="rev12"     label={"Omsætning " + selectedYear}       title={"Samlet omsætning " + selectedYear + " (kr.)"}                              align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="10%"/>
                    <SortTh col="revPct"    label="Oms. %"                            title="Omsætningsvækst i % - seneste 12 mdr. ift. foregående 12 mdr."             align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="7%"/>
                    <SortTh col="ebitda12"  label={"EBITDA " + selectedYear}          title={"EBITDA " + selectedYear + " (kr.)"}                                        align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="10%"/>
                    <SortTh col="ebitdaPct" label="EBITDA %"                          title="EBITDA-ændring i % - seneste 12 mdr. ift. foregående 12 mdr."              align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="7%"/>
                    <SortTh col="equity"    label={"Egenkapital " + selectedYear}     title={"Bogført egenkapital " + selectedYear + " (kr.)"}                           align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="10%"/>
                    <SortTh col="bigCust"   label="Største kunde"                     title="Andel af omsætning fra største enkelt kunde - gennemsnit seneste 24 mdr. (%)" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="8%"/>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const td = { padding: "9px 7px", fontSize: 12 };
                    return (
                      <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => go("workspace:" + r.id + ":financials")}>
                        <td style={{ ...td, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                          <span style={{ fontWeight: 500, color: "var(--c-ink)" }}>{r.name}</span>
                          <span className="mono" style={{ color: "var(--c-text-3)", fontSize: 11, marginLeft: 6 }}>({r.cvr})</span>
                        </td>
                        <td style={{ ...td, color: "var(--c-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{r.dept}</td>
                        <td title={r.branche} style={{ ...td, color: "var(--c-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{r.branche}</td>
                        <td className="mono num" style={{ ...td, textAlign: "right" }}>{fmt(r.rev12)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{pct(r.revPct)}</td>
                        <td className="mono num" style={{ ...td, textAlign: "right", color: r.ebitda12 < 0 ? "var(--c-danger)" : "inherit", fontWeight: r.ebitda12 < 0 ? 600 : 400 }}>{fmt(r.ebitda12)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{pct(r.ebitdaPct)}</td>
                        <td className="mono num" style={{ ...td, textAlign: "right", color: r.equity < 0 ? "var(--c-danger)" : "inherit", fontWeight: r.equity < 0 ? 600 : 400 }}>{fmt(r.equity)}</td>
                        <td style={{ ...td, textAlign: "right", color: r.bigCust > 50 ? "var(--c-warn)" : "inherit" }}>{r.bigCust}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--c-line-2)", fontSize: 12, color: "var(--c-text-3)" }}>
                Viser {results.length} af {ANALYSE_CASES.length} kunder
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

window.PortfolioAnalyse = PortfolioAnalyse;
