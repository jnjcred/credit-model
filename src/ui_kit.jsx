/* ── Fælles, stille byggeklodser ─────────────────────────────────────────────
   Mønstret fra "Anmod om materiale" (se WSMaterialModal i workspace.jsx) gjort
   genbrugeligt, så resten af appen kan bruge det samme udtryk:
   - CWFold: en foldet række med antal, fx "Godkendt (4)".
   - CWSeg: neutral segmenteret kontrol (grå baggrund, hvid aktiv).
   - CWStatus: status som grå tekst; rød kun når der skal handles.
   CSS-klasserne står i styles.css under "Fælles byggeklodser" (.cw-row,
   .cw-row-title, .cw-row-meta, .cw-row-cat, .btn-ghost-sm, .cw-fold, .cw-seg,
   .cw-tabs, .cw-status). */

/** Foldet række med chevron og antal. Styret (open + onToggle) eller selvstændig (defaultOpen). */
function CWFold({ label, count, open, onToggle, defaultOpen, children, id, className, style }) {
  const [own, setOwn] = React.useState(!!defaultOpen);
  const isOpen = open != null ? open : own;
  const toggle = () => { if (onToggle) onToggle(!isOpen); if (open == null) setOwn(!isOpen); };
  const panelId = id || undefined;
  return (
    <div className={'cw-fold-wrap' + (className ? ' ' + className : '')} style={style}>
      <button type="button" className="cw-fold" aria-expanded={isOpen} aria-controls={panelId} onClick={toggle}>
        <I.ChevronRight size={12} aria-hidden="true" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}/>
        <span>{label}{count != null ? ' (' + count + ')' : ''}</span>
      </button>
      {isOpen && <div id={panelId} className="cw-fold-body">{children}</div>}
    </div>
  );
}

/** Neutral segmenteret kontrol. options: [{ k, l }], value, onChange(k). */
function CWSeg({ options, value, onChange, ariaLabel, size }) {
  return (
    <div className={'cw-seg' + (size === 'sm' ? ' sm' : '')} role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o.k} type="button" aria-pressed={value === o.k} onClick={() => onChange && onChange(o.k)}>{o.l}</button>
      ))}
    </div>
  );
}

/** Status som tekst. tone: 'danger' giver rød tekst (kun når der skal handles), ellers grå. */
function CWStatus({ tone, children, title }) {
  return <span className={'cw-status' + (tone === 'danger' ? ' danger' : tone === 'strong' ? ' strong' : '')} title={title}>{children}</span>;
}

/** Spørg, før en fil fjernes. Løser med true, hvis brugeren bekræfter. */
function cwConfirmRemove(name, text, opts) {
  opts = opts || {};
  return CW.confirm({
    title: opts.title || t('Fjern {file}?').replace('{file}', name),
    text: text || '',
    confirmLabel: opts.confirmLabel || t('Fjern filen'),
    danger: true,
  }).then(r => !!(r && r.ok));
}

/* Mærke på alt, AI har skrevet: ikon og tekst. Er rådgiveren gået ind i teksten, står der også det
   (edited). compact = kun ikonet (med forklaringen som tooltip), til små rækker. */
function AiBadge({ edited, compact, title }) {
  const label = edited ? t('AI-genereret + rådgiverens rettelser') : t('AI-genereret');
  return (
    <span className={'ai-badge' + (edited ? ' edited' : '')} role="note" aria-label={label} title={title || label}>
      <I.Spark size={11} aria-hidden="true"/>
      {!compact && <span>{label}</span>}
    </span>
  );
}

Object.assign(window, { CWFold, CWSeg, CWStatus, cwConfirmRemove, AiBadge });
