/* ================= 3.2: swipe a row to the left to delete it (with «Отменить») =================
   A row is wrapped by swOpen(kind, id) … swClose(): .swp > .swp-act (the red «Удалить» layer) + .swp-fg (the row itself).
   Short swipe → the row stays open on a red button; long swipe (or a fast flick) → it flies out and is deleted.
   The data is really deleted only after the «Отменить» toast is gone (or the app is hidden), so undo never has to rebuild anything. */
const SW_OPEN = 92, SW_UNDO_MS = 8800;
const SW_KINDS = {
  w:{ msg:'Тренировка удалена', commit:id => deleteWorkout(id) },
  h:{ msg:'Привычка удалена', commit:id => habRemove(id) },
  s:{ msg:'Добавка удалена', commit:id => supRemove(id) },
};
function swOpen(kind, id) { return `<div class="swp" data-key="sw-${kind}-${esc(id)}" data-swipe="${kind}" data-sid="${esc(id)}"><div class="swp-act" data-act="swipeDel" aria-hidden="true"><span class="swp-lbl">${icon('trash')}<b>Удалить</b></span></div><div class="swp-fg">`; }
const swClose = () => '</div></div>';
const swHid = id => !!(S.swHide && S.swHide.has(id));
function swVis(list) { return S.swHide && S.swHide.size ? list.filter(x => !S.swHide.has(x.id)) : list; }
function habRemove(id) {
  const p = S.profile, used = Object.values(p.hlog).some(t => t && t[id] != null);
  if (used) { const h = p.habits.find(x => x.id === id); if (h) h.ar = true; } // keep the history and the xp already earned
  else p.habits = p.habits.filter(x => x.id !== id);
  habFullFix(p, startOfDay(Date.now())); saveProfile();
}
function supRemove(id) {
  const p = S.profile; p.supps = p.supps.filter(x => x.id !== id);
  Object.keys(p.slog).forEach(k => { const l = p.slog[k].filter(x => x !== id); if (l.length) p.slog[k] = l; else delete p.slog[k]; });
  saveProfile();
}
function swCommit() {
  const p = S.swPend; if (!p) return;
  clearTimeout(p.timer); S.swPend = null;
  if (p.pid === S.pid) { try { SW_KINDS[p.kind].commit(p.id); } catch (e) { logErr && logErr(e); } } // another profile is open now: leave the data alone
  if (S.swHide) S.swHide.delete(p.id);
  render();
}
function swipeDelete(kind, id) {
  swCommit();
  if (!SW_KINDS[kind]) return;
  (S.swHide || (S.swHide = new Set())).add(id);
  S.swPend = { kind, id, pid:S.pid, timer:setTimeout(swCommit, SW_UNDO_MS) };
  render(); toast(SW_KINDS[kind].msg, '', { act:'swipeUndo', label:'Отменить' });
}
function swipeRun(sw) {
  const kind = sw.dataset.swipe, id = sw.dataset.sid, host = sw.closest('li') || sw, fg = sw.querySelector(':scope > .swp-fg');
  buzz([10, 40, 10]); sfx('del');
  if (RM) { swipeDelete(kind, id); return; }
  sw.classList.add('on', 'armed', 'out'); sw.style.setProperty('--p', 1);
  fg.style.transition = 'transform .26s cubic-bezier(.5,0,.9,.6)'; fg.style.transform = 'translate3d(-106%,0,0)';
  host.style.height = host.offsetHeight + 'px'; host.style.overflow = 'hidden'; void host.offsetHeight;
  host.style.transition = 'height .26s .16s cubic-bezier(.3,0,.2,1), opacity .22s .16s'; host.style.height = '0px'; host.style.opacity = '0';
  setTimeout(() => swipeDelete(kind, id), 440);
}
Object.assign(A, {
  swipeDel: el => { const sw = el.closest('.swp'); if (sw) swipeRun(sw); },
  swipeUndo: () => {
    const p = S.swPend; if (!p) return;
    clearTimeout(p.timer); S.swPend = null; if (S.swHide) S.swHide.delete(p.id);
    clearTimeout(toast.t); S.toast = null; renderToast(); sfx('tab'); buzz(8); render();
  },
});
(() => {
  let g = null, openSw = null;
  const fgOf = sw => sw.querySelector(':scope > .swp-fg'), armAt = w => Math.max(170, w * .5);
  function setX(sw, x, anim) {
    const fg = fgOf(sw); if (!fg) return;
    fg.style.transition = anim ? 'transform .32s cubic-bezier(.2,.8,.2,1)' : 'none'; fg.style.transform = x ? `translate3d(${x}px,0,0)` : '';
    sw.style.setProperty('--p', Math.min(1, Math.max(0, -x / SW_OPEN)).toFixed(3));
    sw.classList.toggle('on', x < -2);
  }
  function closeSw(sw, anim = true) { if (!sw) return; setX(sw, 0, anim); sw.classList.remove('open', 'armed'); if (openSw === sw) openSw = null; }
  document.addEventListener('pointerdown', e => {
    const t = e.target, fg = t.closest && t.closest('.swp-fg');
    if (openSw && !(fg && fg.parentElement === openSw) && !(t.closest && t.closest('.swp-act'))) closeSw(openSw);
    if (!fg || S.sheets.length || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const sw = fg.parentElement, now = performance.now();
    g = { sw, fg, id:e.pointerId, x0:e.clientX, y0:e.clientY, x:0, base:sw.classList.contains('open') ? -SW_OPEN : 0, mode:null, w:sw.offsetWidth, lx:e.clientX, lt:now, v:0, armed:false };
  }, true);
  document.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.mode) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g = null; return; } // the page is scrolling
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      g.mode = 'h'; g.sw.classList.add('drag'); try { g.fg.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
    }
    const now = performance.now(); g.v = (e.clientX - g.lx) / Math.max(1, now - g.lt); g.lx = e.clientX; g.lt = now;
    let x = g.base + dx;
    if (x > 0) x *= .18; else if (x < -SW_OPEN) x = -SW_OPEN + (x + SW_OPEN) * .9; // a little resistance after the button
    x = Math.max(x, -g.w); g.x = x; setX(g.sw, x, false);
    const arm = -x >= armAt(g.w); if (arm !== g.armed) { g.armed = arm; g.sw.classList.toggle('armed', arm); buzz(arm ? 9 : 4); if (arm) sfx('arm'); }
  });
  const end = e => {
    if (!g || e.pointerId !== g.id) return;
    const s = g; g = null; if (s.mode !== 'h') return;
    s.sw.classList.remove('drag'); s.sw._moved = performance.now();
    if (e.type === 'pointercancel') { closeSw(s.sw); return; }
    const x = s.x;
    if (-x >= armAt(s.w) || (s.v < -1.1 && -x > SW_OPEN * .7)) swipeRun(s.sw);
    else if (-x > SW_OPEN * .5 || (s.v < -.6 && -x > 24)) { if (openSw && openSw !== s.sw) closeSw(openSw); setX(s.sw, -SW_OPEN, true); s.sw.classList.add('open'); openSw = s.sw; buzz(5); }
    else closeSw(s.sw);
  };
  document.addEventListener('pointerup', end, true); document.addEventListener('pointercancel', end, true);
  // the click that ends a drag must not open the row; a tap on an opened row only closes it
  document.addEventListener('click', e => {
    const fg = e.target.closest && e.target.closest('.swp-fg'); if (!fg) return;
    const sw = fg.parentElement;
    if (sw._moved && performance.now() - sw._moved < 400) { e.stopPropagation(); e.preventDefault(); return; }
    if (sw.classList.contains('open')) { e.stopPropagation(); e.preventDefault(); closeSw(sw); }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') swCommit(); });
  window.addEventListener('pagehide', swCommit);
})();
