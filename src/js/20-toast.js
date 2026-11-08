/* ================= toast ================= */
function toast(text, kind = '', action = null) {
  S.toast = { text, kind, action }; renderToast();
  clearTimeout(toast.t); toast.t = setTimeout(() => { S.toast = null; renderToast(); }, action ? 9000 : kind === 'pr' ? 4200 : 3000);
}
function renderToast() {
  const r = $('#toast-root'), t = S.toast, cur = r.querySelector('.toast');
  if (!t) { if (cur && !cur.classList.contains('out')) { cur.classList.add('out'); setTimeout(() => { if (!S.toast) r.innerHTML = ''; }, 220); } return; }
  r.innerHTML = `<div class="toast ${t.kind}">${t.kind === 'pr' ? icon('star', 'ic-f') : ''}<span>${esc(t.text)}</span>${t.action ? `<button class="btn btn-sm" data-act="${t.action.act}">${esc(t.action.label)}</button>` : ''}</div>`;
}

