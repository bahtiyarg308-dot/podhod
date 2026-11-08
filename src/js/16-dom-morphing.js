/* ================= DOM morphing ================= */
const keyOf = n => n.nodeType === 1 ? (n.getAttribute('data-key') || n.id || null) : null;
function syncAttrs(a, b) {
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
}
function morph(a, b) {
  if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  syncAttrs(a, b);
  const tag = a.tagName;
  if (tag === 'INPUT') { if (document.activeElement !== a) { const v = b.getAttribute('value') ?? ''; if (a.value !== v) a.value = v; } return; }
  if (tag === 'TEXTAREA') { if (document.activeElement !== a) { const v = b.value; if (a.value !== v) a.value = v; } return; }
  if (a.classList && a.classList.contains('chart') && a.dataset.sig && a.dataset.sig === b.dataset.sig) return;
  if (a.classList && a.classList.contains('mascot') && a.getAttribute('data-mood') === b.getAttribute('data-mood')) return;
  morphChildren(a, b);
  if (tag === 'SELECT') { const sel = b.querySelector('option[selected]'); if (sel && a.value !== sel.value) a.value = sel.value; }
}
function morphChildren(a, b) {
  const keyed = new Map();
  for (const n of a.childNodes) { const k = keyOf(n); if (k) keyed.set(k, n); }
  const bn = [...b.childNodes];
  let i = 0;
  for (const nb of bn) {
    const k = keyOf(nb), cur = a.childNodes[i];
    let m = null;
    if (k && keyed.has(k)) { m = keyed.get(k); if (m.nodeName !== nb.nodeName) m = null; }
    else if (!k && cur && !keyOf(cur) && cur.nodeType === nb.nodeType && cur.nodeName === nb.nodeName) m = cur;
    if (m) { if (k) keyed.delete(k); if (m !== cur) a.insertBefore(m, cur || null); morph(m, nb); }
    else a.insertBefore(nb, cur || null);
    i++;
  }
  while (a.childNodes.length > i) a.removeChild(a.lastChild);
}

