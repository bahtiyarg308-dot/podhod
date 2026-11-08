/* ================= rest bar ================= */
function restHTML() {
  const t = S.rest, left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000)), over = left === 0;
  const off = Math.max(0, Math.min(100, 100 * (1 - (t.end - Date.now()) / t.total)));
  return `<div class="restbar${over ? ' over' : ''}" role="timer" aria-label="Таймер отдыха">
    <svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="ring-bg"/><circle cx="18" cy="18" r="15" class="ring-fg" id="ring-fg" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${off.toFixed(2)}"/></svg>
    <div class="rest-txt"><span class="rest-lbl">${over ? 'Пора работать' : 'Отдых'}</span><span class="rest-time" id="rest-time">${fmtClock(left)}</span></div>
    ${over ? '' : `<button class="btn btn-sm" data-act="restAdj" data-d="-15">−15</button><button class="btn btn-sm" data-act="restAdj" data-d="15">+15</button>`}
    <button class="icon-btn" data-act="restSkip" aria-label="Закрыть таймер">${icon('x')}</button></div>`;
}
function renderRest() {
  document.body.classList.toggle('resting', !!S.rest.end);
  const r = $('#rest-root'), cur = r.querySelector('.restbar');
  if (!S.rest.end) { if (cur && !cur.classList.contains('out')) { cur.classList.add('out'); setTimeout(() => { if (!S.rest.end) r.innerHTML = ''; }, 220); } return; }
  const tmp = document.createElement('div'); tmp.innerHTML = restHTML();
  if (cur && !cur.classList.contains('out')) morph(cur, tmp.firstElementChild); else r.innerHTML = tmp.innerHTML;
}

