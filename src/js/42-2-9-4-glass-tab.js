/* ================= 2.9.4: glass tab bar — press and slide a finger along it, the lens follows and the screens flip live ================= */
(() => {
  const tb = $('#tabbar'); if (!tb) return;
  let st = null;
  const PAD = 4, geo = () => { const r = tb.getBoundingClientRect(), n = tb.querySelectorAll('.tab').length || 1; return { l:r.left + PAD, w:(r.width - 2 * PAD) / n, n }; };
  const idxAt = x => { const g = geo(); return Math.max(0, Math.min(g.n - 1, Math.floor((x - g.l) / g.w))); };
  const fracAt = x => { const g = geo(); return Math.max(0, Math.min(g.n - 1, (x - g.l) / g.w - .5)); };
  const go2 = () => { if (!st) return; st.raf = 0; const v = (tabsNow()[st.idx] || [])[0]; if (v && v !== tabOf(S.view)) go(v); };
  tb.addEventListener('pointerdown', e => {
    if ((e.pointerType === 'mouse' && e.button > 0) || !e.target.closest('.tab') || S.sheets.length) return;
    st = { id:e.pointerId, x0:e.clientX, moved:false, idx:idxAt(e.clientX), raf:0 };
    try { tb.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
    tb.style.setProperty('--ti', fracAt(e.clientX)); tb.classList.add('press'); buzz(4); sfx('lens', st.idx);
  });
  tb.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.moved && Math.abs(e.clientX - st.x0) > 6) st.moved = true;
    tb.style.setProperty('--ti', fracAt(e.clientX));
    const i = idxAt(e.clientX);
    if (i !== st.idx) { st.idx = i; buzz(5); sfx('lens', i); if (!st.raf) st.raf = requestAnimationFrame(go2); }
  });
  const end = e => {
    if (!st || e.pointerId !== st.id) return;
    const s = st; cancelAnimationFrame(s.raf); tb._sw = Date.now();
    if (e.type !== 'pointercancel') { const v = (tabsNow()[idxAt(e.clientX)] || [])[0]; if (v && (v !== S.view || !s.moved)) go(v); }
    st = null; tb.classList.remove('press'); moveInd(); requestAnimationFrame(moveInd);
  };
  tb.addEventListener('pointerup', end); tb.addEventListener('pointercancel', end);
  tb.addEventListener('contextmenu', e => { if (st) e.preventDefault(); });
  // the press already handled the tap — the click that follows must not do it twice
  tb.addEventListener('click', e => { if (tb._sw && Date.now() - tb._sw < 600 && e.detail > 0) { e.stopPropagation(); e.preventDefault(); } }, true);
})();

