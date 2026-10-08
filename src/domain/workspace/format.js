// Sagen (workspace): tekster, beløb, tal og datoer. Flyttet uændret fra workspace.jsx ved
// migrationen til Vue (skærmene ligger i src/views/workspace/). Bare globaler (t, CW) læses
// via window, som i resten af src/domain.

// Tekst med variable: wsFill(oversat tekst med {email}, { email })
function wsFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
}

// Ental/flertal: wsPlural(n, tekst for 1, tekst med {n})
function wsPlural(n, one, many) { return n === 1 ? one : wsFill(many, { n }); }

function wsInitials(name) {
  return String(name || '').split(' ').filter(w => /^[A-ZÆØÅ]/.test(w)).slice(0, 2).map(w => w[0]).join('') || '?';
}

// Beløb i kroner: "DKK 3,6 mio." / "DKK 3.6m"
function wsMoney(v) {
  if (v == null || v === '' || isNaN(Number(v))) return '';
  const n = Number(v);
  const en = window.CW_LANG === 'en';
  const loc = en ? 'en-GB' : 'da-DK';
  if (Math.abs(n) >= 1e6) {
    const m = (n / 1e6).toLocaleString(loc, { maximumFractionDigits: 1 });
    return en ? 'DKK ' + m + 'm' : 'DKK ' + m + ' mio.';
  }
  return 'DKK ' + n.toLocaleString(loc);
}
function wsNum(v, digits) {
  if (v == null || v === '' || isNaN(Number(v))) return '';
  return Number(v).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK', { maximumFractionDigits: digits == null ? 1 : digits });
}

// "Sendt 29. sep. 13:40" eller "Sendt 29. sep. 13:40 · opdateret 29. sep. 15:02"
// dateOnly: kun datoen (til trin og lister), klokkeslættet står i title
function wsSentText(r, dateOnly) {
  if (!r) return '';
  const f = dateOnly ? wsDay : CW.fmtWhen;
  const first = r.firstSentAt || r.sentAt;
  return (r.version || 1) > 1 && first !== r.sentAt
    ? wsFill(t('Sendt {first} · opdateret {when}'), { first: f(first), when: f(r.sentAt) })
    : wsFill(t('Sendt {when}'), { when: f(r.sentAt) });
}
// Når en dansk dato ("9. okt.") slutter sætningen, står der kun ét punktum
function wsDot(s) { return String(s).replace(/\.\.$/, '.'); }
// Dato uden klokkeslæt til lister og trin: dansk "30-09-2026"; engelsk "30 Sep" i år, ellers med årstal
function wsDay(iso) {
  const s = CW.fmtDate(iso);
  if (!s) return '';
  if (window.CW_LANG !== 'en') return s;
  const y = String(new Date(iso).getFullYear());
  return y === String(new Date().getFullYear()) ? s.replace(new RegExp('\\s' + y + '$'), '') : s;
}

// Sidehenvisning på det aktive sprog: "s. 3" bliver "p. 3" på engelsk
function wsRef(ref) {
  const r = t(String(ref || ''));
  return window.CW_LANG === 'en' ? r.replace(/^s\. /, 'p. ').replace(/^ark /, 'sheet ').replace(/^linje /, 'line ') : r;
}

function wsTodayIso() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

// Kundens valg af datadeling som kort tekst: "løbende" eller "tal til og med 30. sep. 2026"
function wsSharingText(sh) {
  if (!sh) return '';
  return sh.mode === 'ongoing' ? t('løbende') : wsFill(t('tal til og med {date}'), { date: CW.fmtDate(sh.dataUntil + 'T12:00:00') });
}

export { wsFill, wsPlural, wsInitials, wsMoney, wsNum, wsSentText, wsDot, wsDay, wsRef, wsTodayIso, wsSharingText };
