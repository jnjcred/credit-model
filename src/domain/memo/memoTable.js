// Credit memo: tabelredigering i et afsnit (rækker og kolonner før og efter, slet, Tab mellem cellerne).
// Direkte på DOM'en, fordi execCommand ikke kan. Flyttet ordret fra src/memo.jsx (linje 3394-3485) ved
// migrationen til Vue; kun export-linjen er ny.

/* ── Tabelredigering ─────────────────────────────────────────────────────────
   Skabelonen beder ordret brugeren om at "tilføje eller slette rækker efter
   behov", men der var ingen måde at gøre det på. execCommand kan ikke, så
   operationerne laves direkte på DOM'en.
   ──────────────────────────────────────────────────────────────────────────── */

/** Finder den celle markøren står i, hvis den står i en tabel. */
function cellAtSelection(root) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  let n = sel.getRangeAt(0).startContainer;
  if (n.nodeType === 3) n = n.parentElement;
  if (!n || !n.closest) return null;
  const cell = n.closest('td, th');
  if (!cell || (root && !root.contains(cell))) return null;
  return cell;
}

/** Alle rækker i tabellen, både i thead og tbody, i visuel rækkefølge. */
function allRows(table) {
  return Array.from(table.querySelectorAll('tr'));
}

function cellIndex(cell) {
  return Array.from(cell.parentElement.children).indexOf(cell);
}

function makeCell(tag, template) {
  const c = document.createElement(tag);
  // Arv justering og skrifttype fra nabocellen, ellers ser tabellen rodet ud
  if (template && template.getAttribute('style')) c.setAttribute('style', template.getAttribute('style'));
  c.innerHTML = '<br>';
  return c;
}

function tableInsertRow(cell, where) {
  const tr = cell.parentElement;
  const row = document.createElement('tr');
  Array.from(tr.children).forEach(c => row.appendChild(makeCell(c.tagName === 'TH' ? 'td' : 'td', c)));
  tr.parentElement.insertBefore(row, where === 'above' ? tr : tr.nextSibling);
  return row.children[cellIndex(cell)] || row.children[0];
}

function tableDeleteRow(cell) {
  const tr = cell.parentElement;
  const table = tr.closest('table');
  if (allRows(table).length <= 1) return null;
  const next = tr.nextElementSibling || tr.previousElementSibling;
  tr.remove();
  return next ? next.children[0] : null;
}

function tableInsertCol(cell, where) {
  const table = cell.closest('table');
  const at = cellIndex(cell);
  allRows(table).forEach(tr => {
    const ref = tr.children[at];
    const tag = ref && ref.tagName === 'TH' ? 'th' : 'td';
    const c = makeCell(tag, ref);
    if (where === 'left') tr.insertBefore(c, ref || null);
    else tr.insertBefore(c, ref ? ref.nextSibling : null);
  });
  return cell;
}

function tableDeleteCol(cell) {
  const table = cell.closest('table');
  const at = cellIndex(cell);
  const first = allRows(table)[0];
  if (!first || first.children.length <= 1) return null;
  allRows(table).forEach(tr => { if (tr.children[at]) tr.children[at].remove(); });
  return null;
}

/** Sætter markøren i en celle. */
function focusCell(cell) {
  if (!cell) return;
  const r = document.createRange();
  r.selectNodeContents(cell);
  r.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}

/** Næste eller forrige celle i tabellen, på tværs af rækker. */
function siblingCell(cell, dir) {
  const table = cell.closest('table');
  const cells = Array.from(table.querySelectorAll('td, th'));
  const i = cells.indexOf(cell);
  return cells[i + dir] || null;
}

// Modul-eksport
export { cellAtSelection, allRows, cellIndex, makeCell, tableInsertRow, tableDeleteRow, tableInsertCol,
  tableDeleteCol, focusCell, siblingCell };
