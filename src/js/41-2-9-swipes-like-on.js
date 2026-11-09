/* ================= 2.9: swipes like on an iPhone =================
   sheet: pull down, or swipe right, or swipe from the left edge → close
   main screens: swipe left / right → next / previous tab
   Not in fields, charts, scrolling strips, the rest bar, the chat composer or while a sign-in screen is shown. */
function swipeTab(dir) {
  if (S.view === 'editor' || S.sheets.length) return;
  const ids = tabsNow().map(t => t[0]), i = ids.indexOf(tabOf(S.view)), n = i < 0 ? null : ids[i + dir]; if (!n) return;
  buzz(6); sfx('tab'); go(n);
  if (!RM) { const m = $('#main'); try { m.animate([{ transform:`translateX(${dir * 36}px)`, opacity:.35 }, { transform:'none', opacity:1 }], { duration:240, easing:'cubic-bezier(.2,.8,.2,1)' }); } catch (e) { /* no animations API */ } }
}
(() => {
  let t = null;
  const NOX = '#tabbar,input,textarea,select,[data-noswipe],.chart,.seg,.chips,.aw-strip,.grab,.sheet-head,.restbar,.composer,.rkrow,.swp';
  const blockedX = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.matches && e.matches(NOX)) return true; const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 2) return true; } return false; };
  const scrolledY = (el, stop) => { for (let e = el; e && e !== stop && e !== document.body; e = e.parentElement) { if (e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollTop > 0) return true; } return false; };
  const snap = s => { if (!s) return; s.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)'; s.style.transform = ''; setTimeout(() => { s.style.transition = ''; }, 280); };
  document.addEventListener('touchstart', e => {
    const tp = top(); if (e.touches.length !== 1 || (tp && tp.gate)) { t = null; return; }
    const p = e.touches[0];
    t = { x:p.clientX, y:p.clientY, at:performance.now(), el:e.target, mode:null, dx:0, dy:0, sheet:tp ? $('#sheet-root .sheet') : null };
  }, { passive:true });
  document.addEventListener('touchmove', e => {
    if (!t) return;
    const p = e.touches[0]; t.dx = p.clientX - t.x; t.dy = p.clientY - t.y;
    if (!t.mode) {
      const ax = Math.abs(t.dx), ay = Math.abs(t.dy); if (ax < 10 && ay < 10) return;
      if (t.sheet && t.dy > 0 && ay > ax * 1.2 && t.el.closest && t.el.closest('.sheet') && !t.el.closest('.grab,.sheet-head,input,textarea,select') && !scrolledY(t.el, t.sheet)) t.mode = 'down';
      else if (ax > ay * 1.8 && ax > 14) t.mode = t.dx > 0 && t.x < 24 ? 'edge' : blockedX(t.el) ? 'none' : 'h';
      else t.mode = 'none';
    }
    if (t.mode === 'down') { t.sheet.style.transition = 'none'; t.sheet.style.transform = `translateY(${Math.max(0, t.dy)}px)`; }
  }, { passive:true });
  document.addEventListener('touchend', () => {
    const s = t; t = null; if (!s || !s.mode || s.mode === 'none') return;
    const dt = Math.max(1, performance.now() - s.at), vx = Math.abs(s.dx) / dt, vy = s.dy / dt;
    if (s.mode === 'down') {
      if (s.dy > 110 || (s.dy > 40 && vy > .6)) { buzz(6); s.sheet.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)'; s.sheet.style.transform = 'translateY(105%)'; setTimeout(() => { if (top()) closeSheet(); }, 200); }
      else snap(s.sheet);
      return;
    }
    if (!(Math.abs(s.dx) > 80 || (Math.abs(s.dx) > 40 && vx > .5))) return;
    if (S.sheets.length) { if (s.dx > 0) { buzz(6); sfx('close'); closeSheet(); } return; }
    if (s.mode === 'h') swipeTab(s.dx < 0 ? 1 : -1);
  }, { passive:true });
  document.addEventListener('touchcancel', () => { if (t && t.mode === 'down') snap(t.sheet); t = null; }, { passive:true });
  /* pause the little animations while scrolling and behind sheets: less repainting, smoother scroll */
  let sc = 0; const root = document.documentElement;
  window.addEventListener('scroll', () => { if (!sc) root.classList.add('scr'); clearTimeout(sc); sc = setTimeout(() => { root.classList.remove('scr'); sc = 0; }, 160); }, { passive:true });
})();

